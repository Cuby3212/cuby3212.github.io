"""Comprobaciones estáticas sin dependencias: python tests/validate_site.py."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import struct
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

def local_reference(value, source):
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path:
        return
    path = (ROOT / unquote(url.path.lstrip('/'))) if url.path.startswith('/') else source.parent / unquote(url.path)
    assert path.is_file() or path.is_dir(), f'Recurso inexistente en {source.name}: {value}'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source, self.stack, self.ids, self.inline_scripts = source, [], [], []
        self.in_script = False
    def attributes(self, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        for key in ('src', 'href', 'poster'):
            if attrs.get(key):
                local_reference(attrs[key], self.source)
        return attrs
    def handle_starttag(self, tag, attrs):
        attrs = self.attributes(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if tag == 'script':
            self.in_script = not attrs.get('src')
    def handle_startendtag(self, tag, attrs):
        self.attributes(attrs)
    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_script = False
        if tag not in VOID:
            assert self.stack and self.stack.pop() == tag, f'Etiqueta mal cerrada: {tag} en {self.source.name}'
    def handle_data(self, data):
        if self.in_script:
            self.inline_scripts.append(data)

def css_structure(text, source):
    quote = None
    stack = []
    cursor = 0
    while cursor < len(text):
        char = text[cursor]
        if char == '\\':
            cursor += 2
            continue
        if quote:
            if char == quote:
                quote = None
        elif char in '\"\'':
            quote = char
        elif text.startswith('/*', cursor):
            end = text.find('*/', cursor + 2)
            assert end >= 0, f'Comentario sin cerrar: {source.name}'
            cursor = end + 2
            continue
        elif char in '{([':
            stack.append(char)
        elif char in '})]':
            assert stack and stack.pop() == {'}':'{',')':'(',']':'['}[char], f'Delimitador CSS: {source.name}'
        cursor += 1
    assert not quote and not stack, f'CSS incompleto: {source.name}'

pages = list(ROOT.glob('*.html'))
for source in pages:
    page = Page(source)
    page.feed(source.read_text(encoding='utf-8'))
    page.close()
    assert not page.stack, f'Etiquetas sin cerrar: {source.name}'
    assert all(count == 1 for count in Counter(page.ids).values()), f'IDs repetidos: {source.name}'
    for script in page.inline_scripts:
        subprocess.run(['node', '--check'], input=script, text=True, check=True, capture_output=True)
for source in ROOT.glob('js/*.js'):
    subprocess.run(['node', '--check', str(source)], check=True, capture_output=True)
for source in ROOT.glob('css/*.css'):
    text = source.read_text(encoding='utf-8')
    css_structure(text, source)
    for match in re.finditer(r'url\(\s*([\"\']?)(.*?)\1\s*\)', text):
        local_reference(match[2], source)
for source in ROOT.glob('images/icons/*.svg'):
    ET.parse(source)
manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
for icon in manifest['icons']:
    local_reference(icon['src'], ROOT / 'manifest.json')
    data = (ROOT / icon['src']).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    width, height = struct.unpack('>II', data[16:24])
    assert icon['sizes'] == f'{width}x{height}', 'Tamaño incorrecto en manifest.json'
print(f'Correcto: {len(pages)} páginas HTML, JavaScript, CSS, recursos locales, SVG y manifiesto.')

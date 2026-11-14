# Comprobación del sitio

Desde la carpeta del proyecto, con Node.js y Python instalados:

```sh
node --test tests/site.test.cjs
python tests/validate_site.py
```

Las once pruebas de comportamiento comprueban relojes, visibilidad de la pestaña,
preferencias, pausa del saludo, desplegables, pulsaciones rápidas, redimensionado,
cancelación del puntero, días especiales y modo secreto. Se ejecutan sobre un DOM
simulado, sin navegador ni dependencias externas.

La validación estática comprueba estructura HTML, IDs únicos, sintaxis JavaScript,
delimitadores CSS, referencias locales, SVG y dimensiones de los iconos del manifiesto.

Estas comprobaciones complementan la revisión visual de temas, animaciones y tamaños
de pantalla; no garantizan por sí solas la ausencia de fallos en todos los navegadores.
El contenido de ejemplo de `privacy.html` todavía debe sustituirse por el texto real.

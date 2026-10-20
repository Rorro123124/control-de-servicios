# Página de Rodrigo Correa

- `contenido.html`: el contenido de la página (es la fuente que se edita).
- `index.html`: la página completa lista para publicar. Se genera a partir de `contenido.html`.

## Si cambias algo en `contenido.html`

Regenera `index.html`:

```bash
cd portafolio
{ printf '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'; sed -n '/^<title>/,/^<\/style>/p' contenido.html; printf '</head>\n<body>\n'; sed '1,/^<\/style>/d' contenido.html; printf '</body>\n</html>\n'; } > index.html
```

## Publicarla gratis

1. Entra a https://app.netlify.com/drop (crea cuenta gratis con tu correo).
2. Arrastra la carpeta `portafolio` a la página.
3. Netlify te da un link tipo `https://algo.netlify.app`. En *Site settings → Change site name* ponle `rodrigocorrea` para que quede `https://rodrigocorrea.netlify.app`.
4. Opcional: compra un dominio `.com.co` (~$60.000–90.000 al año) y conéctalo en *Domain settings*.

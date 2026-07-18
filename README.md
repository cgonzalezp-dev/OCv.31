# OCv.31

## Polla Futbolera (Google Apps Script)

- `polla-futbolera.html`: interfaz completa (login, partidos con pronósticos, tabla de grupos, ranking y perfil), con modo demo integrado para previsualizarla directamente en el navegador sin backend.
- `Codigo.gs`: backend de Apps Script (`doGet`, lectura/escritura en Google Sheets, cálculo de ranking).

### Despliegue rápido

1. Crea un proyecto en [script.google.com](https://script.google.com) (o vinculado a un Spreadsheet).
2. Copia `Codigo.gs` como archivo de script y `polla-futbolera.html` como archivo HTML.
3. En el Spreadsheet, crea las hojas `Partidos` y `Pronosticos` con las columnas descritas al inicio de `Codigo.gs`.
4. Implementar → Nueva implementación → Aplicación web.

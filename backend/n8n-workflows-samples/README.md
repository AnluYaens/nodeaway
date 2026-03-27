## n8n Workflow Samples

Esta carpeta documenta los contratos de entrada y salida que el backend espera de n8n.

No incluye los workflows reales ni prompts internos del proyecto.

Cada sample define:

- `workflow`: identificador de la automatización
- `webhookPath`: ruta pública que consume el backend
- `expectedRequest`: ejemplo de payload entrante
- `expectedResponse`: ejemplo de respuesta compatible con Nodeaway

Los workflows reales viven fuera del repositorio y `backend/n8n-workflows/` queda excluido de Git.

# B-DEVOPS — Notion CRM Setup

Pasos para conectar B-DEVOPS con Notion via n8n.

## 1. Crear la base de datos en Notion

1. Abre Notion y crea una pagina nueva: **"B-DEVOPS Clientes"**
2. Dentro, crea una **base de datos de tabla** con las siguientes propiedades:

| Propiedad         | Tipo          | Notas                        |
|-------------------|---------------|------------------------------|
| Nombre (titulo)   | Title         | Username del usuario         |
| Email             | Email         | Email del usuario            |
| Estado            | Select        | Pendiente / Aprobado / Rechazado |
| Motivo            | Text          | Por que quiere acceso        |
| User ID           | Text          | ID interno de la BD          |
| Fecha Registro    | Date          |                              |
| Fecha Aprobacion  | Date          |                              |
| Fuente            | Text          | "B-DEVOPS"                   |

3. Copia el **ID de la base de datos** desde la URL:
   `https://notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...`
   El ID es la parte de 32 caracteres antes del `?v=`

## 2. Conectar la integracion de Notion

1. Ve a https://www.notion.so/my-integrations
2. Abre o crea la integracion **"proyecto"**
3. En la base de datos B-DEVOPS Clientes -> **...** -> **Connections** -> busca y añade "proyecto"
4. El token de la integracion es: `REDACTED`

## 3. Importar workflows en n8n (OPCIÓN AUTOMÁTICA — recomendada)

Con n8n corriendo, ejecuta en PowerShell:

```powershell
cd D:\aura-ops\infra\n8n
.\setup-n8n.ps1 -NotionDbId "TU_NOTION_DB_ID_AQUI"
```

Este script: crea la credencial Notion, importa y activa ambos workflows automáticamente.

## 3b. Importar workflows en n8n (MANUAL)

1. Accede a n8n: `https://crm.bdev.qzz.io` (desde VPN) o `http://10.100.0.1:5678`
2. **Workflow 1:** Importa `workflow-user-register.json`
   - Reemplaza `YOUR_NOTION_DATABASE_ID_HERE` con el ID de tu BD
   - Configura credencial Notion con el token
   - Activa el workflow
3. **Workflow 2:** Importa `workflow-user-approved.json`
   - Mismo proceso

## 4. Configurar credencial Notion en n8n

En n8n -> Settings -> Credentials -> New -> **Notion API**:
- **API Key:** `REDACTED`
- Nombre: `Notion API`

## 5. Verificar el flujo

1. Ve a B-DEVOPS (`https://app.bdev.qzz.io`)
2. En la pantalla de inicio, tab **Registrarse**
3. Rellena el formulario y envia
4. Comprueba que en Notion aparece la entrada con estado "Pendiente"
5. En B-DEVOPS -> Config -> Usuarios -> Aprobar el usuario
6. Comprueba que en Notion el estado cambia a "Aprobado"

## URLs de webhook (configuradas automaticamente)

- Registro: `https://crm.bdev.qzz.io/webhook/user-register`
- Aprobacion: `https://crm.bdev.qzz.io/webhook/user-approved`

Estos webhooks se llaman automaticamente desde el backend cuando ocurren los eventos.

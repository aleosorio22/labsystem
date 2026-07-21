# LabSystem

Sistema de laboratorio clínico (migración del sistema Laravel "Lab Santa Fe" a un stack moderno).

- **backend/** — API REST en Node.js + Express (monolito modular), MySQL con Knex, JWT + bcrypt, roles y permisos (RBAC), auditoría en bitácora, PDFs con pdfmake.
- **frontend/** — React + Vite + Tailwind CSS v4. Colores en `frontend/src/config/theme.css`, iconos en `frontend/src/config/icons.js`, menú en `frontend/src/config/nav.js` (todo centralizado: se cambia en un solo lugar).

## Flujo de negocio

Una **orden** (`cotizacion` + `cotizacion_detalle`) pasa por tres estados (`estado_documento`):

1. **Cotización** → se crea con paciente, médico y exámenes (los combos se expanden automáticamente).
2. **Análisis en proceso** (venta) → se capturan resultados según el tipo de examen:
   numérico (con rangos), positivo/negativo, tecleado (texto), heces y orina (formularios por categoría/parámetro), estático.
3. **Finalizado** → PDF de resultados, aviso por WhatsApp; puede reabrirse con permiso.

Anular una orden exige reconfirmar la contraseña del usuario (igual que el sistema anterior).

## Puesta en marcha

```bash
# Base de datos
mysql -u root -p -e "CREATE DATABASE labsystem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Backend
cd backend
cp .env.example .env        # completar credenciales
npm install
npm run migrate             # crea el esquema
npm run seed                # roles, permisos, tipos de examen, usuario sysadmin/admin123
npm run dev                 # http://localhost:4000

# Frontend
cd ../frontend
npm install
npm run dev                 # http://localhost:5173 (proxy /api → 4000)
```

Usuario inicial: **sysadmin / admin123** (cámbialo en producción).

## Migración de datos desde el sistema anterior

1. Importar el dump de producción de Laravel en una BD local (p.ej. `seanlabsantafe`).
2. Configurar `LEGACY_DB_NAME` en `backend/.env`.
3. `npm run etl:legacy` — copia catálogos, usuarios (conservan su contraseña, hash bcrypt compatible), pacientes, médicos, exámenes, combos, órdenes, resultados (incluye heces/orina) y bitácora, conservando los IDs originales.
4. `npm run seed` — restaura permisos/roles y el usuario `sysadmin` (el ETL trunca `users`).

Los roles legados (super-admin, Administrador, Analista, Secretaria, Secretaria-cotizacion)
se mapean automáticamente a los roles nuevos con permisos equivalentes.

## Pendientes conocidos

- Subida de archivos adjuntos a órdenes (tabla `archivos` ya existe en el esquema).
- Resultados de orina con valor de texto libre (el esquema lo soporta; falta en la UI de captura).
- Reportes secundarios del sistema anterior (talonario, contactos, existencias) y módulo de inventario.
- Subsistema MEL/indicadores del legado (registro/indicador/financiero/des_*): fuera del alcance del laboratorio.

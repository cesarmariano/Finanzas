# Finanzas Personales

Aplicación web que se usa desde el navegador (Chrome) en el iPhone, la Mac y Linux, sin instalar, para administrar las finanzas mensuales: ingresos, gastos, tarjetas de crédito,
saldo del banco, remanente para ahorrar y sugerencias de inversión. Sincroniza con Google Drive y funciona sin conexión.

- Aplicación: https://cesarmariano.github.io/Finanzas/

## Secciones
- **Mes**: ingresos y gastos del mes, previstos o cobrados/pagados, con su fecha. "Preparar el mes" agrega los habituales.
  - Ingresos iniciales: sueldo, alquiler 1 y 2, Alveon – alquiler de CPAP, Alveon – otras ventas, alquileres y servicios, otros ingresos (editables en Ajustes).
  - Gastos iniciales: gas, electricidad, hipoteca, impuesto automotor de cada auto, otros gastos.
  - Si la aplicación Alveon está en el mismo dispositivo, el ingreso de CPAP ofrece la suma de cuotas de los CPAP en alquiler.
  - **Saldo del banco**: con el saldo cargado y las fechas de cada movimiento se proyecta el saldo día por día.
  - **Remanente**: lo que puede retirarse hoy sin que el saldo baje de la reserva mínima en ningún día hasta el fin del mes,
    incluidos los pagos del mes siguiente que vencen antes de su primer ingreso (por ejemplo, la tarjeta que vence antes del sueldo).
  - Gastos por cuenta (Consumo, Impuestos, Servicios, Vivienda, Cargos bancarios; editables), cronograma del saldo y PDF del mes.
- **Resumen de la cuenta bancaria**: en la pantalla del mes se importa el PDF del extracto. Cada crédito se asigna a su fuente
  (sueldo, alquileres, Alveon, otros) y cada débito a un gasto habitual o a un pago de tarjeta. Lo asignado queda como cobrado
  o pagado, completa el movimiento previsto del mes y el saldo final pasa a ser el saldo del banco. El signo de cada
  movimiento se deduce del saldo de la línea. La aplicación recuerda la asignación por concepto (incluido el nombre de quien
  transfiere) y no duplica movimientos al volver a importar el mismo resumen.
  En resúmenes de BBVA, los movimientos se toman de la sección de la cuenta (con saldo) y se completan con las secciones
  "Compras Visa Débito" (comercio), "Transferencias recibidas / enviadas" (nombre o CUIT) e "Intervinientes" (titulares).
  Los débitos se clasifican por cuenta y se suman en un gasto por mes y cuenta; las devoluciones restan del gasto.
- **Tarjetas**: resúmenes mensuales. Se importan desde el PDF del banco (también protegidos con clave) o se cargan a mano.
  Cada consumo se asigna a una cuenta; la aplicación sugiere la cuenta y recuerda lo elegido para cada comercio.
  El resumen se asigna al mes del vencimiento y el pago sale del banco en esa fecha. Admite consumos en dólares.
- **Ahorro**: disponible para ahorrar, fondo de emergencia, sugerencias según el perfil (conservador, moderado, agresivo)
  y las tasas cargadas, e inversiones (plazo fijo, UVA, caución, money market, dólares, bonos, CEDEARs, acciones).
  Los plazos fijos con fecha de vencimiento vuelven al banco en la proyección del saldo.
- **Año**: ahorro por mes, tabla con acumulado, ingresos por fuente y gastos por cuenta.

Las sugerencias son orientativas y no constituyen asesoramiento financiero.

## Reglas de cálculo
- **Período de cada mes**: cierra el día configurado en Ajustes (por defecto, el 20, como el resumen del banco).
  "Noviembre" va del 21/10 al 20/11. Con día de cierre 0 se usan meses calendario.
- **Pesos y dólares se llevan por separado y nunca se convierten**: los dólares se cobran y se pagan en dólares (cuenta en dólares).
  Cada moneda tiene sus totales, su saldo, su reserva y su remanente. Los resúmenes de tarjeta se pagan en pesos y en dólares por separado.
- La aplicación no es instalable: se usa desde el navegador (no tiene manifiesto).
- **Privacidad**: el código no contiene datos personales. Nombres de titulares, tarjetas de débito y conceptos se configuran en
  Ajustes y se guardan sólo en cada dispositivo y en el Google Drive del usuario.
- El saldo cargado incluye los movimientos **marcados como cobrados o pagados** hasta su fecha. Los que siguen como previstos
  con fecha anterior se toman como pendientes: los pagos se aplican en la fecha del saldo y los cobros, por prudencia, al fin del mes.
- Si un mes no tiene saldo cargado, parte del saldo final proyectado del mes anterior.
- Ahorro del mes (en cada moneda) = ingresos − (gastos fijos y otros + pagos de tarjetas). Las inversiones no son gastos: sólo mueven dinero.

## Puesta en marcha
1. **Publicación**: en el repositorio, *Settings → Pages* → *Deploy from a branch* → rama `main`, carpeta `/ (root)`.
2. **Google Drive**: requiere un ID de cliente de OAuth de Google Cloud (proyecto "Finanzas personales") con
   - origen autorizado de JavaScript: `https://cesarmariano.github.io`
   - URI de redireccionamiento autorizado: `https://cesarmariano.github.io/Finanzas/index.html`
   - permiso `drive.file` y la propia cuenta agregada como usuario de prueba.

   El ID de cliente (no es secreto) se carga en `config.js` o en **Ajustes** de la aplicación.
   Los datos quedan en la carpeta **Finanzas familiares** de Drive (`finanzas.json` y un respaldo diario).
3. En cada dispositivo: **Ajustes → Conectar Google Drive** con la misma cuenta (una sola vez).
   El permiso de Google dura 1 hora; al abrir la aplicación con el permiso vencido, se renueva solo pasando por Google
   sin mostrar pantallas (`prompt=none`) y se sincroniza. Si Google pide intervenir (por ejemplo, la contraseña),
   la nube de la barra superior queda para reconectar con un toque.

## Privacidad
Este repositorio contiene sólo el programa. Los datos financieros se guardan en cada dispositivo y en el Google Drive del usuario; nunca en GitHub.

## Datos
Cada dispositivo guarda una copia local. Al sincronizar, por cada registro (movimiento, resumen, inversión, etc.) prevalece su versión más reciente.

## Versiones
Se definen en `version.js` (MAYOR.MENOR.CORRECCIÓN). Al publicar cambios, aumentar el número y agregar la entrada en `FIN_NOVEDADES`.

## Íconos
`python3 tools/generar_iconos.py` vuelve a generar los íconos de la carpeta `icons/`.

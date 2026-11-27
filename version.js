/* Versión de la aplicación: único lugar donde se define.
   Formato MAYOR.MENOR.CORRECCIÓN
   - MAYOR: cambio grande (por ejemplo, una sección nueva).
   - MENOR: función nueva.
   - CORRECCIÓN: corrección de errores.
   Al publicar cambios: aumentar el número y agregar la entrada al principio de NOVEDADES.
   También lo usa sw.js para que cada dispositivo descargue la versión nueva. */
self.FIN_VERSION = '1.11.0';
self.FIN_NOVEDADES = [
  { v: '1.11.0', fecha: '2026-11-27', cambios: [
    'Resumen bancario: un pago de tarjeta cuyo resumen no está cargado se registra igual como gasto ("Tarjeta sin itemizar"); al cargar después ese resumen, lo reemplaza.',
    'Transferencias recibidas con el CUIT pegado al nombre: se identifican (por ejemplo, transferencias propias).',
    'Las reglas recordadas sólo se aplican al mismo tipo de movimiento: una regla de un crédito ya no se usa en un débito.'
  ] },
  { v: '1.10.2', fecha: '2026-11-26', cambios: ['Resumen bancario: al importar un resumen anterior ya no se reemplaza un saldo del banco más reciente.'] },
  { v: '1.10.1', fecha: '2026-11-26', cambios: ['Privacidad: el código ya no incluye nombres, tarjetas ni cuentas; los titulares y los conceptos se configuran en Ajustes y quedan sólo en los datos de cada usuario.'] },
  { v: '1.10.0', fecha: '2026-11-25', cambios: [
    'Titular de cada consumo: en las tarjetas de crédito se toma de las secciones "Consumos de ..." del resumen; en el banco, de la tarjeta de débito con que se hizo la compra.',
    'La primera vez se indica de quién es cada tarjeta de débito; se recuerda y se puede cambiar en Ajustes → Titulares.',
    'Filtro por titular en los resúmenes de tarjeta y "Consumos con tarjeta por titular" en el mes.',
    'Al volver a importar un resumen de tarjeta ya cargado, se puede reemplazar conservando las cuentas asignadas.'
  ] },
  { v: '1.9.1', fecha: '2026-11-25', cambios: ['Resumen bancario: la moneda se toma de cada cuenta del resumen ("CA $" pesos, "CA U$S" dólares); los movimientos y saldos de cada cuenta se registran en su moneda. El selector de moneda sólo aparece si el resumen no la indica.'] },
  { v: '1.9.0', fecha: '2026-11-25', cambios: ['Nuevo gasto habitual "Alveon – gastos" y nueva cuenta "Alveon", para separar los gastos de la empresa en los débitos del banco y en los consumos de tarjeta.'] },
  { v: '1.8.1', fecha: '2026-11-25', cambios: ['Resumen bancario: los "CR/DB DEBIN" se clasifican como extracciones de efectivo (cuenta Consumo).'] },
  { v: '1.8.0', fecha: '2026-11-25', cambios: ['Nuevo gasto habitual "Haberes servicio doméstico" (cuenta Servicios), disponible para asignar débitos y transferencias del banco.'] },
  { v: '1.7.1', fecha: '2026-11-25', cambios: ['Tarjetas BBVA: se leen bien el cierre, el vencimiento y los saldos de la cabecera en dos renglones; esos renglones y los de "otros períodos" ya no se toman como consumos.'] },
  { v: '1.7.0', fecha: '2026-11-25', cambios: [
    'Cada mes va del 21 al 20, igual que el resumen del banco ("Noviembre" = del 21/10 al 20/11). El día de cierre se cambia en Ajustes (0 = mes calendario).',
    'El sueldo de fin de mes queda en el mismo período que los gastos que cubre.',
    'Al importar el resumen bancario se registra la fecha real de pago de cada tarjeta y el resumen pasa al período de ese pago.'
  ] },
  { v: '1.6.0', fecha: '2026-11-25', cambios: [
    'Resumen de BBVA: se leen sólo los movimientos de la cuenta (sin contar dos veces las compras con débito) y se completan con el detalle del resumen.',
    'Cada "PAGO CON VISA DEBITO" muestra el comercio y se clasifica por cuenta; las devoluciones restan del gasto.',
    'Las transferencias muestran quién envió o recibió el dinero; las transferencias entre los titulares de la cuenta no se cuentan.',
    'La cuota del préstamo hipotecario se reconoce como Hipoteca.',
    'Se pueden corregir movimientos ya registrados al volver a importar el resumen.',
    'Asignación de todos los débitos sin asignar a una cuenta con un toque.'
  ] },
  { v: '1.5.0', fecha: '2026-11-24', cambios: [
    'Resumen bancario: los débitos (compras con tarjeta de débito, extracciones, débitos automáticos, impuestos y comisiones) se clasifican solos por cuenta: Consumo, Servicios, Impuestos, Cargos bancarios...',
    'Los débitos de cada cuenta se suman en un gasto por mes ("Débitos del banco – Consumo"), con el detalle en las notas.',
    'Las transferencias quedan "sin asignar" para que se indique si son un gasto o un pase entre cuentas propias.',
    'Se quitan del concepto los encabezados del banco y los códigos iniciales; se borran las reglas "No registrar" guardadas por defecto.'
  ] },
  { v: '1.4.0', fecha: '2026-11-24', cambios: ['La aplicación deja de ser instalable: se usa desde el navegador (Chrome). En Ajustes se muestra la dirección para abrirla en otros dispositivos.'] },
  { v: '1.3.0', fecha: '2026-11-24', cambios: [
    'Pesos y dólares por separado, sin cotización: los dólares se cobran y se pagan en dólares.',
    'Saldo, reserva y remanente de la cuenta en dólares; resúmenes de tarjeta con pago en pesos y en dólares.',
    'Resumen bancario: se indica si la cuenta es en pesos o en dólares.',
    'Nuevo nombre: Finanzas Personales. Identificador propio para que el navegador no la confunda con Alveon y ofrezca instalarla.'
  ] },
  { v: '1.2.0', fecha: '2026-11-24', cambios: [
    'Resumen de la cuenta bancaria: se importa el PDF y cada crédito se asigna a su fuente (sueldo, alquileres, Alveon...). También pagos de servicios, hipoteca y tarjetas.',
    'Lo asignado se registra como cobrado o pagado, completa el movimiento previsto del mes y actualiza el saldo del banco.',
    'Tarjetas: se corrigen los impuestos contados dos veces y los consumos en dólares tomados como pesos (resúmenes de BBVA), también en los resúmenes ya cargados.',
    'Tarjetas: gas, agua, Rentas y municipalidad se asignan a Servicios o Impuestos.'
  ] },
  { v: '1.1.0', fecha: '2026-11-24', cambios: ['Google Drive: conexión automática. Al abrir la aplicación, si el permiso de Google venció, se renueva solo y se sincroniza sin tocar ningún botón.', 'La conexión inicial pasa por la página de Google y vuelve (sin ventana emergente).'] },
  { v: '1.0.1', fecha: '2026-11-24', cambios: ['Google Drive: ID de cliente propio del proyecto "Finanzas personales".'] },
  { v: '1.0.0', fecha: '2026-11-20', cambios: [
    'Primera versión: ingresos y egresos mensuales, saldo del banco y remanente para ahorrar.',
    'Resúmenes de tarjetas de crédito: importación desde PDF y asignación de cada consumo a una cuenta.',
    'Inversiones, fondo de emergencia y sugerencias para el dinero ahorrado.',
    'Resumen anual, PDF del mes y sincronización con Google Drive.'
  ] }
];

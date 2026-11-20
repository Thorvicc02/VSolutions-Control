# VSolutions Control

App para registrar impresiones, inventario de rollos y saldos por cliente. Pensada para instalarse en el iPad. Los datos se guardan solo en este dispositivo; no viajan a un servidor.

**Abrir:** https://thorvicc02.github.io/VSolutions-Control/

## Instalar en el iPad

1. Abre el enlace en **Safari** (no en Chrome ni desde un atajo).
2. Toca **Compartir**.
3. Elige **Agregar a pantalla de inicio**.
4. Confirma el nombre **VSolutions**.

## Uso

La app tiene 4 pestañas: **Hoy**, **Trabajos**, **Clientes** e **Inventario**.

- En **Trabajos**, el botón **+ Nuevo trabajo** abre el formulario: fecha, cliente, material, medidas o m² y el total.
- El inventario descuenta metros del rollo que corresponde. El adhesivo laminado descuenta adhesivo glossy y adhesivo transparente matte. Si el material es del cliente, no se descuenta nada.
- En **Clientes** cada tarjeta muestra el saldo pendiente (suma de los trabajos sin pagar), ordenado de mayor a menor. Al tocar un cliente ves sus trabajos pendientes y el botón **Generar cobro**, que arma el cobro con todas las líneas y el total; desde ahí lo descargas en PDF o imagen, o lo compartes por WhatsApp o Mail. Generar el cobro no cambia ningún dato. Los datos de pago (banco, cuenta, RUT, email) que salen al pie se editan en Clientes → Datos de pago.
- En **Hoy** ves el resumen, la ganancia por mes y la sección **Respaldo de datos**: **Exportar JSON** (respaldo), **Exportar CSV** (listado de trabajos) e **Importar JSON** (reemplaza los datos de este dispositivo).

Haz un respaldo JSON de vez en cuando. Si reinstalas la app o cambias de dispositivo, importa ese archivo para recuperar todo.

El repositorio no incluye clientes ni trabajos: la primera vez verás el catálogo de materiales y el inventario inicial, sin historial.

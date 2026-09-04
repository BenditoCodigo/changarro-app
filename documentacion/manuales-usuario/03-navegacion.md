# Navegación

Este documento explica cómo moverte dentro de Changarro y acceder a cada sección
de la aplicación.

---

## La barra inferior (navegación principal)

En la parte inferior de la pantalla siempre verás tres pestañas. Son la forma
principal de moverte entre las secciones de Changarro:

| Pestaña     | Qué hace                                                   |
| ----------- | ---------------------------------------------------------- |
| **Inicio**  | Muestra tu catálogo de productos para agregar al carrito   |
| **Carrito** | Muestra los productos que vas a cobrar en la venta actual  |
| **Ventas**  | Muestra el historial de todas las ventas que has realizado |

La pestaña activa se resalta para que siempre sepas en qué sección estás.

---

## La barra superior

En la parte superior de la pantalla verás:

- El nombre **Changarro** (o el nombre de tu negocio)
- El total de la venta actual
- Un ícono de perfil que te lleva a los **Ajustes**

---

## Secciones de la aplicación

### Inicio (Vender)

Es la pantalla principal para registrar ventas. Si el modo de escáner está activo en Ajustes, la pantalla cuenta con 2 pestañas superiores:

1. **📦 Catálogo (Vista tradicional)**:
   - **Buscar**: barra de búsqueda por nombre, categoría o código de barras.
   - **Cambiar vista**: alterna entre vista de lista y vista de cuadrícula.
   - **Agregar al carrito**: toca un producto y se agrega automáticamente al carrito.
   - **Venta rápida**: toca el botón **+** (abajo a la derecha) para agregar un producto o servicio temporal.

2. **📷 Escáner Cajero (Modo Supermercado)**:
   - **Cámara continua**: mantiene la cámara activa para pasar productos rápidamente uno tras otro como en un punto de venta.
   - **Pausa de lectura (2s)**: evita registrar por accidente dos veces el mismo producto de forma inmediata.
   - **Producto registrado**: emite un sonido, vibración y muestra una notificación flotante confirmando la adición al carrito.
   - **Código no registrado**: si escaneas un producto que no está en el catálogo, muestra una alerta permitiendo agregarlo como Venta Rápida o registrarlo en el Inventario.

### Carrito

Aquí ves todo lo que llevas en la venta actual.

- **Ajustar cantidades**: usa los botones **+** y **-** junto a cada producto
- **Eliminar un producto**: toca el botón de eliminar y confirma en la ventana que aparece
- **Ver totales**: el subtotal, IVA (si está activo) y total se calculan automáticamente
- **Cobrar**: toca el botón **Cobrar** para ir a la pantalla de Cobro (Checkout) e ingresar el pago.

### Cobro (Checkout)

Se accede desde el botón **Cobrar** en la pantalla del Carrito. Es una interfaz ágil para recibir el dinero y calcular el cambio rápidamente.

- **Monto recibido**: campo para ingresar el dinero que te entrega el cliente.
- **Botones de ajuste rápido (`-1` y `+1`)**: suma o resta un peso de forma rápida y cómoda sin tener que abrir el teclado.
- **Sugerencias de pago**: botones para seleccionar cantidades predefinidas (como $50, $100, $200, $500, o el pago exacto) basadas en tu total.
- **Cálculo de cambio**: se muestra en tiempo real el cambio a devolver (en verde) o la cantidad restante en caso de ser insuficiente (en rojo).
- **Cobro seguro**: el botón de cobrar cuenta con un contador regresivo de 3 segundos antes de habilitarse para evitar confirmaciones accidentales. Al finalizar la venta, se muestra una animación festiva de fuegos artificiales verdes y el sistema te regresa inmediatamente a la pantalla de **Inicio** para atender al siguiente cliente.

### Ventas (historial y reportes)

Aquí aparecen las ventas que has realizado, con filtros para encontrar fácilmente lo que buscas.

- **Ver detalle**: toca cualquier venta para ver exactamente qué productos vendiste, en qué cantidad, y el total con su desglose
- **Filtros de fecha** (botones en la parte superior derecha):
  - **Turno**: muestra solo las ventas del turno activo (visible únicamente si tienes turnos habilitados)
  - **Hoy**: muestra las ventas del día actual
  - **Mes**: muestra las ventas del mes actual; si tocas de nuevo el botón aparece un selector para elegir cualquier mes desde el primero con ventas registradas
- **Menú de opciones** (tres puntos ⋮ en la esquina superior):
  - **📊 Reporte del negocio**: abre la pantalla de resumen con tarjetas de datos clave, indicadores visuales de ventas y la opción de **Exportar a Excel (.xlsx)**
  - **🔒 Cerrar turno** (si turnos está activo): te lleva a la pantalla de cierre donde verás el resumen de caja
  - **📜 Historial de turnos** (si turnos está activo): ver todos los turnos registrados

### Reporte del negocio (Reportes y Excel)

Se accede desde el menú de opciones (⋮) en la pantalla de Ventas. Muestra un resumen visual de las cuentas de tu negocio sin tablas complejas:

- **Filtro de período**: elige entre **Hoy**, **Esta Semana**, **Este Mes** o **Todo**.
- **Tarjetas de datos clave (KPIs)**: consulta de un vistazo el Total Cobrado, Compras Atendidas, Ticket Promedio y la proporción de ventas en Efectivo vs. Tarjeta.
- **Cuentas Claras del Negocio**: oraciones explicativas en lenguaje amigable que te informan tu **Producto Estrella**, tu **Día Más Fuerte** de la semana y tu **Hora Pico** con mayor flujo de clientes.
- **Gráficas visuales simples**:
  - *Tendencia de ventas*: barras verticales diarias destacando el día con más ventas con una estrella.
  - *Top 5 productos*: barra de avance horizontal con los productos con mayor rotación.
- **Botonera de exportación**: genera un archivo de Excel (`.xlsx`) con 3 pestañas (Resumen de Ventas, Detalle Completo de Ventas e Inventario) listo para descargar o compartir por WhatsApp.

### Ajustes

Se accede desde el ícono de perfil en la barra superior (no desde la barra
inferior).

Aquí puedes:

- Cambiar el nombre de tu negocio
- Configurar la moneda
- Activar o desactivar el cálculo de IVA
- **Habilitar turnos de caja**: activa el sistema de turnos para registrar tus ventas por turno. Al habilitarlo se abre automáticamente el primer turno. Cuando está activo, cada venta queda vinculada al turno en curso
- Acceder al **Inventario** para gestionar tus productos
- **Respaldar datos (Exportar)**: descarga una copia de seguridad en un archivo `.json` que contiene tu catálogo de productos (incluyendo imágenes), tus ventas completadas, tus turnos y la configuración del negocio
- **Restaurar respaldo (Importar)**: selecciona un archivo de respaldo `.json` para combinarlo con tus datos actuales. Los registros del archivo se agregarán o actualizarán de forma segura sin borrar tu inventario o historial actual

### Inventario

Se accede desde Ajustes. Aquí gestionas tu catálogo completo de productos.

- **Buscar productos**: usa la barra de búsqueda por nombre, categoría o código de barras
- **Agregar producto**: toca el botón **+** para crear uno nuevo
- **Escanear código de barras**: al crear o editar un producto, puedes tocar el botón de cámara para capturar su código de barras automáticamente con la cámara del dispositivo (o ingresarlo manualmente)
- **Editar producto**: toca un producto existente para modificar sus datos o código
- **Eliminar producto**: usa el botón de eliminar y confirma

### Venta rápida

Se accede desde el botón **+** en la pantalla de Inicio. Te permite agregar un
producto o servicio personalizado al carrito sin necesidad de registrarlo
permanentemente en tu inventario.

Llena el nombre, precio y categoría, y al tocar **Agregar al Carrito** se
agregará y la aplicación te llevará directamente al carrito.

### Turnos de caja

Funcionalidad opcional que se activa desde **Ajustes → Turnos de caja**.
Permite organizar las ventas por turnos de trabajo.

- **Turno activo**: cuando los turnos están habilitados, cada venta queda registrada bajo el turno en curso. En la pantalla de Ventas verás un indicador verde con el número y hora de apertura del turno activo
- **Cerrar turno**: desde el menú ⋮ en Ventas, elige “Cerrar turno” para ir a la pantalla de cierre:
  - Verás el total en caja, la cantidad de ventas y el ticket promedio
  - Puedes registrar un **faltante** si el efectivo no cuadra (es solo informativo)
  - Puedes escribir **observaciones** sobre el turno
  - Al confirmar se inicia automáticamente el siguiente turno
- **Historial de turnos**: desde el mismo menú puedes ver todos los turnos con su duración, total y estado. Toca cualquiera para ver su detalle completo

---

## Resumen de navegación

```
Barra inferior:
  Inicio ─── Carrito ─── Ventas

Barra superior:
  Ajustes (ícono de perfil)
    └── Inventario
          ├── Nuevo Producto
          └── Editar Producto

Inicio:
  └── Venta Rápida (botón +)

Carrito:
  └── Cobro / Checkout (botón Cobrar)

Ventas:
  ├── Detalle de Venta (al tocar una venta)
  └── Menú ⋮ (solo con turnos habilitados)
        ├── Cerrar Turno
        │     └── Pantalla de Cierre de Turno
        └── Historial de Turnos
              └── Detalle de Turno
                    └── Detalle de Venta (al tocar una venta)
```

---

## Siguientes pasos

- [Volver a primeros pasos](./02-primeros-pasos.md)
- [Volver al índice](./README.md)

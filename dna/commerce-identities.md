# Identidades comerciales de 3DNAU

El registro versionable de propietarios es `scripts/commerce-identities.json`;
no es contenido Hugo ni un asset público. Conserva las 57 asignaciones históricas,
55 productos actuales y dos bajas permanentes:

- `3DNAU-0025` / `0b438fc3-1f8a-4ac9-aeed-3bc7b198e76b`: célula eucariota animal.
- `3DNAU-0026` / `538ca008-5dc8-4183-b549-9f3914ba6ce9`: célula eucariota vegetal.

El siguiente SKU es `3DNAU-0058`. No renumerar supervivientes ni rellenar bajas.
`key` identifica la ruta de producto sin idioma; todas sus traducciones conservan
la misma pareja UUID/SKU. El registro no contiene precios, contacto ni datos legales.

## Alta y baja propias de esta tienda

Crea únicamente la ficha y traducciones autorizadas, sin UUID/SKU nuevos a mano.
Desde la raíz, con dependencias instaladas:

```sh
node scripts/commerce-products.js assign
node scripts/commerce-products.js assign --apply
node scripts/commerce-products.js validate
pnpm test
```

El primer comando no escribe. `--apply` reserva UUID/SKU en el registro antes de
completar campos ausentes en las fichas; una interrupción se recupera repitiendo
el comando. Las altas quedan `commerce_active: false` salvo activación explícita;
no usar `--active` para suplir una decisión comercial. Revisar y conservar juntos
registro y contenido en la publicación autorizada, sin borrarlo al clonar.

Después de eliminar todas las traducciones de una baja autorizada, ejecuta
`assign --apply` para marcar su propietario `retired: true`; la validación exige
esa baja y rechaza reutilización de su ruta/UUID/SKU. Para un cambio de ruta del
mismo producto, modifica explícitamente solo `key` en el registro y conserva
UUID/SKU en sus traducciones, antes de validar. No retirar y reasignar identidades.

El catálogo reconciliado a `c1ee5fa96118acc42cb760b9fba1fcdda15b3980` tiene 55
productos y 12 categorías; esa referencia congelada no sustituye el preflight
previo a publicación. Los precios/editorial de Saray no se recalculan con el
allocator. Catálogo/carrito siguen sin autorización de checkout real.

Uso compartido y apagado seguro: [manual SanSoul](../core/README-ROOT.md#comercio-opt-in).

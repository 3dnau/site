# ADN de 3DNAU

## Identidad y oferta

3DNAU ofrece material didáctico manipulativo fabricado mediante impresión 3D, con colecciones de biología, psicopedagogía, recursos inclusivos/Braille, Montessori y básicos de aula. La web actual describe fabricación bajo pedido. La investigación pública se destila en [Audiencia, oferta y voz](audiencia-oferta-voz.md), separando afirmaciones de marca de decisiones comerciales pendientes.

## Decisiones confirmadas por Loren

- Titular: Saray, autónoma establecida en España. No es una sociedad. El nombre legal completo, NIF y datos de facturación deben ser facilitados/validados por ella; no completar con conjeturas.
- Evolución autorizada: pasar de catálogo a ecommerce con carrito y pago mediante Stripe Checkout; Cloudflare Workers Free permanente con Static Assets, API de comercio y una base D1 propia de la tienda; GitHub Actions construye y prepara la publicación. La adaptación local no autoriza desplegar, cambiar DNS/subdominio de cuenta ni activar pagos.
- Los productos de 3DNAU se fabrican bajo demanda; no descontar stock numérico. Otras tiendas consumidoras de SanSoul podrán activar inventario real.
- Asignar SKU/identificador comercial estable a cada producto y documentar altas futuras, sin derivarlo de títulos, traducciones o posiciones editables.
- Eliminar el formulario provisional de selección de productos al integrar el carrito. El contacto de la home es independiente y debe conservarse.
- Mantener las URLs, contenido editorial y relaciones de categorías. Las ediciones concurrentes de Saray mediante Sveltia en main prevalecen sobre snapshots antiguos.
- Integración local en `feat/workers-free-local` en consumidor y tema, basada en feature 7.1.0 con reconciliación local contextual de las mejoras del tema main 7.3.1; sin merge a main ni publicación. Destino futuro explícito `3dnau/site`; origin histórico seacomoseo no es destino de publicación. CMS usa `cms_repo: 3dnau/site`, preservando 3dnau.com y skip_ci true. Sin push/deploy/Actions habilitado ni cobros.
- Mantenimiento solo manual: límite propuesto <=4 barridos/día condicionado al presupuesto Free compartido medido, no cron ni busy-loop. Checkout permanece false; D1 placeholder y protección de environment/main son gates pendientes. GL_PAT confirmado por metadata en `3dnau/site`; permiso efectivo, mapping y restore GitLab aún sin validar.
- Piloto verificado: `3dnau.com` / `3dnau/site`. La instrucción de continuidad menciona `3dnow.com`, identidad no comprobada: no renombrar dominio/repositorio por inferencia. El original `seacomoseo/3dnau.com` y su alojamiento siguen siendo la fuente de producción hasta cutover aprobado; la copia es candidata, no producción. No integrar ahora el rescate de formularios ni nuevas mejoras concurrentes de main.

## Pendientes comerciales

IVA incluido/excluido y tipos aplicables; destinos y tarifas de envío; plazo/capacidad de fabricación; productos personalizables y pedidos por presupuesto; facturación a particulares/centros; condiciones de venta, devoluciones y privacidad. Preparar un cuestionario único para Saray. El NIF ficticio existente no valida cumplimiento legal.

## Fuentes y documentos

- Confirmaciones de Loren en conversación de autorización del 3 de octubre de 2026.
- Sitio público: https://3dnau.com/ ; aviso legal: https://3dnau.com/legal/ .
- Este índice es el contexto confirmado inicial. Los documentos específicos de negocio, audiencia e integraciones se añadirán sólo si aportan información nueva y trazable; las instrucciones genéricas de SanSoul viven en sus documentos canónicos.
- [Identidades comerciales y altas de 3DNAU](commerce-identities.md): registro,
  bajas permanentes y siguiente SKU; uso compartido del carrito en el manual SanSoul.

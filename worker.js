import { createCommerceWorker } from './themes/sansoul/commerce/worker.js'
import { catalog } from './functions/_commerce/catalog.generated.js'
import { onRequest as checkout } from './functions/api/commerce/checkout.js'
import { onRequest as quote } from './functions/api/commerce/quote.js'
import { onRequest as webhook } from './functions/api/commerce/webhook.js'
import { onRequest as status } from './functions/api/commerce/status/[orderId].js'
import { onRequest as admin } from './functions/api/commerce/admin/[[path]].js'

export default createCommerceWorker(catalog, { checkout, quote, webhook, status, admin })

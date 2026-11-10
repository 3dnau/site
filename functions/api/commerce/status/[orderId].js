import { handleOrderStatus } from '../../../../core/commerce/status.js'

export async function onRequest (context) {
  return handleOrderStatus(context.request, context.env)
}

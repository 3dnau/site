import { handleWebhook } from '../../../core/commerce/webhook.js'

export async function onRequest (context) {
  return handleWebhook(context.request, context.env)
}

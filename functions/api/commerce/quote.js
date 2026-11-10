import { catalog } from '../../_commerce/catalog.generated.js'
import { handleQuote } from '../../../core/commerce/quote.js'

export async function onRequest (context) {
  return handleQuote(context.request, context.env, catalog)
}

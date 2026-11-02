import { catalog } from '../../_commerce/catalog.generated.js'
import { handleQuote } from '../../../themes/sansoul/commerce/quote.js'

export async function onRequest (context) {
  return handleQuote(context.request, context.env, catalog)
}

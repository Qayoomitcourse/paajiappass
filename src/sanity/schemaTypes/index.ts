import { type SchemaTypeDefinition } from 'sanity'
import employee from './employee'
import task from './task'
import user from './user'
import circular from './circular'
import publicNotice from './publicNotice'
import publicTemplate from './publicTemplate'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [employee, task, user, circular, publicNotice, publicTemplate],
}

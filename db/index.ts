import { drizzle } from 'drizzle-orm/netlify-db'
import * as schema from './schema.js'

const create = () => drizzle({ schema })
type Db = ReturnType<typeof create>

let instance: Db | undefined

// Created on first use so importing this module never needs a connection
// (keeps unit tests and SSR route imports working without NETLIFY_DB_URL).
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= create()
    const value = Reflect.get(instance, prop, instance)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

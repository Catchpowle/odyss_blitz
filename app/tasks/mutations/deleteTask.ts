import { resolver } from "blitz"
import db from "db"
import * as z from "zod"

const DeleteTask = z
  .object({
    id: z.number(),
  })
  .nonstrict()

export default resolver.pipe(resolver.zod(DeleteTask), resolver.authorize(), async ({ id }) => {
  // TODO: in multi-tenant app, you must add validation to ensure correct tenant
  const task = await db.task.deleteMany({ where: { id } })

  return task
})

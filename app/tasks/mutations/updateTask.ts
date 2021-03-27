import { resolver } from "blitz"
import db from "db"
import * as z from "zod"

const UpdateTask = z
  .object({
    id: z.number(),
    description: z.string().min(1).optional(),
    isComlete: z.boolean().optional(),
    startedAt: z.date().optional(),
    endedAt: z.date().optional(),
    userId: z.number().optional(),
  })
  .nonstrict()

export default resolver.pipe(
  resolver.zod(UpdateTask),
  resolver.authorize(),
  async ({ id, ...data }) => {
    // TODO: in multi-tenant app, you must add validation to ensure correct tenant
    const task = await db.task.update({ where: { id }, data })

    return task
  }
)

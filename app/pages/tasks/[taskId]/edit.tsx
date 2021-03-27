import { Suspense } from "react"
import { Head, Link, useRouter, useQuery, useMutation, useParam, BlitzPage } from "blitz"
import Layout from "app/core/layouts/Layout"
import getTask from "app/tasks/queries/getTask"
import updateTask from "app/tasks/mutations/updateTask"
import { TaskForm, FORM_ERROR } from "app/tasks/components/TaskForm"
import { roundToNearestMinutes } from "date-fns"

export const EditTask = () => {
  const router = useRouter()
  const taskId = useParam("taskId", "number")
  const [task, { setQueryData }] = useQuery(getTask, { id: taskId })
  const [updateTaskMutation] = useMutation(updateTask)

  return (
    <>
      <Head>
        <title>Edit Task {task.id}</title>
      </Head>

      <div>
        <h1>Edit Task {task.id}</h1>
        <pre>{JSON.stringify(task)}</pre>

        <TaskForm
          submitText="Update Task"
          // TODO use a zod schema for form validation
          //  - Tip: extract mutation's schema into a shared `validations.ts` file and
          //         then import and use it here
          // schema={UpdateTask}
          initialValues={task}
          onSubmit={async (values) => {
            try {
              const updated = await updateTaskMutation({
                id: task.id,
                ...values,
              })
              await setQueryData(updated)
              router.push(`/tasks/${updated.id}`)
            } catch (error) {
              console.error(error)
              return {
                [FORM_ERROR]: error.toString(),
              }
            }
          }}
        />
      </div>
    </>
  )
}

const EditTaskPage: BlitzPage = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <EditTask />
      </Suspense>

      <p>
        <Link href="/tasks">
          <a>Tasks</a>
        </Link>
      </p>
    </div>
  )
}

EditTaskPage.authenticate = true
EditTaskPage.getLayout = (page) => <Layout>{page}</Layout>

export default EditTaskPage

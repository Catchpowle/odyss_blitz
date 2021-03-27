import React, { Suspense, FC } from "react"
import { Head, usePaginatedQuery, useMutation, useRouter, BlitzPage, invalidateQuery } from "blitz"
import Layout from "app/core/layouts/Layout"
import getTasks from "app/tasks/queries/getTasks"
import updateTask from "app/tasks/mutations/updateTask"
import { TaskForm, FORM_ERROR } from "app/tasks/components/TaskForm"
import { useCurrentUser } from "app/core/hooks/useCurrentUser"
import { addMinutes, roundToNearestMinutes, isFuture, format } from "date-fns"
import createTask from "app/tasks/mutations/createTask"
import { Center, Checkbox, HStack, List, ListItem, Stack, Text } from "@chakra-ui/react"

const ITEMS_PER_PAGE = 100

type TaskProps = {
  id: number
  description: string
  isComplete: boolean
  startedAt: Date
  endedAt: Date
}

const Task: FC<TaskProps> = ({ id, description, isComplete, startedAt, endedAt }) => {
  const formatDate = (date) => format(date, "HH:mm")
  const [updateTaskMutation] = useMutation(updateTask)
  const textColor = isComplete ? "gray.500" : "gray.800"

  return (
    <ListItem>
      <HStack spacing="24px">
        <Checkbox
          onChange={async (e) => {
            await updateTaskMutation({ id, isComplete: e.target.checked })
            invalidateQuery(getTasks)
          }}
          isChecked={isComplete}
        />

        <Stack>
          <Text color={textColor}>{`${formatDate(startedAt)} - ${formatDate(endedAt)}`}</Text>
          <Text color={textColor}>{description}</Text>
        </Stack>
      </HStack>
    </ListItem>
  )
}

export const TasksList = () => {
  const router = useRouter()
  const page = Number(router.query.page) || 0
  const [{ tasks, hasMore }] = usePaginatedQuery(getTasks, {
    orderBy: { id: "asc" },
    skip: ITEMS_PER_PAGE * page,
    take: ITEMS_PER_PAGE,
  })
  const goToPreviousPage = () => router.push({ query: { page: page - 1 } })
  const goToNextPage = () => router.push({ query: { page: page + 1 } })
  const currentUser = useCurrentUser()
  const [createTaskMutation] = useMutation(createTask)

  return (
    <Center>
      <Stack>
        <TaskForm
          submitText="Create Task"
          // TODO use a zod schema for form validation
          //  - Tip: extract mutation's schema into a shared `validations.ts` file and
          //         then import and use it here
          // schema={CreateTask}
          // initialValues={{}}
          onSubmit={async ({ description }) => {
            if (!currentUser) {
              return
            }

            const sanitizedDescription = description.trim()

            if (!Boolean(sanitizedDescription)) {
              return
            }

            const previousTask = tasks[tasks.length - 1]
            const startedAt =
              previousTask && isFuture(previousTask.endedAt)
                ? previousTask.endedAt
                : roundToNearestMinutes(new Date(), { nearestTo: 5 })
            const endedAt = addMinutes(startedAt, 30)
            const userId = currentUser.id

            try {
              await createTaskMutation({
                userId,
                startedAt,
                endedAt,
                description: sanitizedDescription,
              })
              invalidateQuery(getTasks)
            } catch (error) {
              console.error(error)
              return {
                [FORM_ERROR]: error.toString(),
              }
            }
          }}
        />
        <List spacing={4}>
          {tasks.map(({ id, description, isComplete, startedAt, endedAt }) => (
            <Task
              id={id}
              key={id}
              description={description}
              isComplete={isComplete}
              startedAt={startedAt}
              endedAt={endedAt}
            />
          ))}
        </List>

        {/* <button disabled={page === 0} onClick={goToPreviousPage}>
          Previous
        </button>
        <button disabled={!hasMore} onClick={goToNextPage}>
          Next
        </button> */}
      </Stack>
    </Center>
  )
}

const TasksPage: BlitzPage = () => {
  return (
    <>
      <Head>
        <title>Tasks</title>
      </Head>

      <div>
        <Suspense fallback={<div>Loading...</div>}>
          <TasksList />
        </Suspense>
      </div>
    </>
  )
}

TasksPage.authenticate = true
TasksPage.getLayout = (page) => <Layout>{page}</Layout>

export default TasksPage

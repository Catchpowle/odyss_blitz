import React, { Suspense, FC, useState, useEffect } from "react"
import {
  Head,
  usePaginatedQuery,
  useMutation,
  useRouter,
  BlitzPage,
  invalidateQuery,
  useInfiniteQuery,
} from "blitz"
import Layout from "app/core/layouts/Layout"
import getTasks from "app/tasks/queries/getTasks"
import updateTask from "app/tasks/mutations/updateTask"
import { TaskForm, FORM_ERROR } from "app/tasks/components/TaskForm"
import { useCurrentUser } from "app/core/hooks/useCurrentUser"
import {
  addMinutes,
  subMinutes,
  differenceInMinutes,
  roundToNearestMinutes,
  isFuture,
  format,
  isEqual,
} from "date-fns"
import createTask from "app/tasks/mutations/createTask"
import {
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  List,
  ListItem,
  Stack,
  Text,
} from "@chakra-ui/react"
import { AddIcon, MinusIcon } from "@chakra-ui/icons"

const ITEMS_PER_PAGE = 100

type CachedTask = {
  id: number
  description: string
  isComplete: boolean
  startedAt: Date
  endedAt: Date
  isSelected: null | number
}

type TaskProps = {
  editState: boolean
  updateSchedule: (id: number, action: string) => any
  selectTask: (id: number, isSelected: null | number) => any
} & CachedTask

const Task: FC<TaskProps> = ({
  id,
  description,
  isComplete,
  startedAt,
  endedAt,
  editState,
  updateSchedule,
  selectTask,
  isSelected,
}) => {
  const formatDate = (date) => format(date, "HH:mm")
  const [updateTaskMutation] = useMutation(updateTask)
  const textColor = isComplete ? "gray.500" : "gray.800"

  return (
    <ListItem my={6}>
      <Flex>
        <HStack spacing="24px" py={2}>
          {editState ? (
            <Checkbox
              onChange={() => {
                selectTask(id, isSelected)
              }}
              isChecked={Boolean(isSelected)}
            />
          ) : (
            <Checkbox
              onChange={async (e) => {
                await updateTaskMutation({ id, isComplete: e.target.checked })
                invalidateQuery(getTasks)
              }}
              isChecked={isComplete}
            />
          )}

          <Stack>
            <Text color={textColor}>{`${formatDate(startedAt)} - ${formatDate(endedAt)}`}</Text>
            <Text color={textColor}>{description}</Text>
          </Stack>
        </HStack>
        {editState && (
          <Stack marginLeft="auto">
            <IconButton
              onClick={() => {
                updateSchedule(id, "INCREMENT")
              }}
              aria-label="Add"
              size="sm"
              icon={<AddIcon />}
            />
            <IconButton
              onClick={() => {
                updateSchedule(id, "DECREMENT")
              }}
              aria-label="Minus"
              size="sm"
              icon={<MinusIcon />}
            />
          </Stack>
        )}
      </Flex>
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
  const [cachedTasks, setCachedTasks] = useState<CachedTask[]>(
    tasks.map((task) => ({ ...task, isSelected: null }))
  )

  const [editState, setEditState] = useState(false)
  const [updateTaskMutation] = useMutation(updateTask)
  const [scheduledMutations, setScheduledMutations] = useState<(() => void)[]>([])
  const scheduleMutations = (mutations) => {
    const mappedMutations = mutations.map((mutation) => {
      return async () => {
        await updateTaskMutation(mutation)
        invalidateQuery(getTasks)
      }
    })

    setScheduledMutations(mappedMutations)
  }
  const executeMutations = () => {
    scheduledMutations.forEach((mutation) => mutation())
  }

  useEffect(() => {
    setCachedTasks(tasks.map((task) => ({ ...task, isSelected: null })))
  }, [tasks])

  const updateSchedule = (id, action) => {
    let cachedTask
    let updatedTask
    const mutations: any[] = []

    const updatedTasks = cachedTasks.map((task) => {
      if (task.id === id) {
        cachedTask = task
        if (action === "INCREMENT") {
          const endedAt = addMinutes(task.endedAt, 5)
          updatedTask = { ...task, endedAt }
          mutations.push({ id, endedAt })
          return updatedTask
        } else if (action === "DECREMENT") {
          const endedAt = subMinutes(task.endedAt, 5)
          updatedTask = { ...task, endedAt }
          mutations.push({ id, endedAt })
          return updatedTask
        }
      } else {
        if (cachedTask && updatedTask) {
          if (isEqual(cachedTask.endedAt, task.startedAt)) {
            cachedTask = task
            const duration = differenceInMinutes(task.endedAt, task.startedAt)
            const startedAt = updatedTask.endedAt
            const endedAt = addMinutes(startedAt, duration)

            updatedTask = {
              ...task,
              startedAt,
              endedAt,
            }

            mutations.push({ id: task.id, startedAt, endedAt })

            return updatedTask
          }
        }

        return task
      }
    })

    scheduleMutations(mutations)
    setCachedTasks(updatedTasks)
  }

  return (
    <Center>
      <Stack minWidth="50%">
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

            const previousTask = cachedTasks[tasks.length - 1]
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
        <Stack spacing="5">
          <Box paddingY={2} paddingX={2} height="30rem" overflow="scroll">
            <List spacing={4}>
              {cachedTasks.map(
                ({ id, description, isComplete, isSelected, startedAt, endedAt }, index) => (
                  <>
                    {editState && index === 0 && (
                      <Center>
                        <Button variant="outline" onClick={() => (startedAt) => {}}>
                          Move here
                        </Button>
                      </Center>
                    )}
                    <Task
                      id={id}
                      key={id}
                      description={description}
                      isComplete={isComplete}
                      startedAt={startedAt}
                      endedAt={endedAt}
                      editState={editState}
                      updateSchedule={updateSchedule}
                      selectTask={(id, isSelected) => {
                        const selectedTasks = cachedTasks.filter((task) => task.isSelected)

                        const updatedTasks = cachedTasks.map((task) => {
                          const taskIsSelected = task.isSelected as null | number
                          if (id === task.id) {
                            return task.isSelected
                              ? { ...task, isSelected: null }
                              : { ...task, isSelected: selectedTasks.length + 1 }
                          } else {
                            return isSelected && taskIsSelected && taskIsSelected > isSelected
                              ? { ...task, isSelected: taskIsSelected - 1 }
                              : { ...task }
                          }
                        })

                        setCachedTasks(updatedTasks)
                      }}
                      isSelected={isSelected}
                    />
                    {editState && (
                      <Center>
                        <Button variant="outline" onClick={() => (endedAt) => {}}>
                          Move here
                        </Button>
                      </Center>
                    )}
                  </>
                )
              )}
            </List>
          </Box>

          <Box>
            {editState ? (
              <HStack>
                <Button
                  onClick={() => {
                    executeMutations()
                    setScheduledMutations([])

                    setEditState(!editState)
                  }}
                >
                  Submit
                </Button>
                <Button
                  onClick={() => {
                    setScheduledMutations([])
                    setCachedTasks(tasks.map((task) => ({ ...task, isSelected: null })))
                    setEditState(!editState)
                  }}
                >
                  Cancel
                </Button>
              </HStack>
            ) : (
              <Button
                onClick={() => {
                  setEditState(!editState)
                }}
              >
                Edit
              </Button>
            )}
          </Box>
        </Stack>

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

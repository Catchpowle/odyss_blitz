import { useState, ReactNode, PropsWithoutRef, KeyboardEvent, useRef } from "react"
import { FormProvider, useForm, UseFormOptions } from "react-hook-form"
import { Textarea } from "@chakra-ui/react"
import * as z from "zod"

type SumbitOnEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => void

export interface FormProps<S extends z.ZodType<any, any>>
  extends Omit<PropsWithoutRef<JSX.IntrinsicElements["form"]>, "onSubmit"> {
  /** All your form fields */
  children?: ReactNode
  /** Text to display in the submit button */
  submitText?: string
  schema?: S
  onSubmit: (values: z.infer<S>) => Promise<void | OnSubmitResult>
  initialValues?: UseFormOptions<z.infer<S>>["defaultValues"]
}

interface OnSubmitResult {
  FORM_ERROR?: string
  [prop: string]: any
}

export const FORM_ERROR = "FORM_ERROR"

export function TaskForm<S extends z.ZodType<any, any>>({
  children,
  submitText,
  schema,
  initialValues,
  onSubmit,
  ...props
}: FormProps<S>) {
  const ctx = useForm<z.infer<S>>({
    mode: "onBlur",
    resolver: async (values) => {
      try {
        if (schema) {
          schema.parse(values)
        }
        return { values, errors: {} }
      } catch (error) {
        return { values: {}, errors: error.formErrors?.fieldErrors }
      }
    },
    defaultValues: initialValues,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  const sumbitOnEnter: SumbitOnEnter = async (e) => {
    if (e.code === "Enter" && !e.shiftKey) {
      e.preventDefault()

      await ctx.handleSubmit(onSubmit)()
      descriptionRef.current && descriptionRef.current.focus()
    }
  }

  return (
    <FormProvider {...ctx}>
      <form
        onSubmit={ctx.handleSubmit(async (values) => {
          const result = (await onSubmit(values)) || {}
          for (const [key, value] of Object.entries(result)) {
            if (key === FORM_ERROR) {
              setFormError(value)
            } else {
              ctx.setError(key as any, {
                type: "submit",
                message: value,
              })
            }
          }
        })}
        className="form"
        {...props}
      >
        <Textarea
          mt={5}
          name="description"
          // isDisabled={ctx.formState.isSubmitting}
          resize="none"
          onKeyDown={(e) => sumbitOnEnter(e)}
          ref={(e) => {
            ctx.register(e)
            descriptionRef.current = e
          }}
        />

        <style global jsx>{`
          .form > * + * {
            margin-top: 1rem;
          }
        `}</style>
      </form>
    </FormProvider>
  )
}

export default TaskForm

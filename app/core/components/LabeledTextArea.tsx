import { forwardRef, PropsWithoutRef, KeyboardEvent } from "react"
import { useFormContext } from "react-hook-form"
import { Textarea } from "@chakra-ui/react"

export interface LabeledTextAreaProps extends PropsWithoutRef<JSX.IntrinsicElements["textarea"]> {
  /** Field name. */
  name: string
  /** Field label. */
  label: string
  outerProps?: PropsWithoutRef<JSX.IntrinsicElements["div"]>
}

type SumbitOnEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => void

export const LabeledTextArea = forwardRef<HTMLTextAreaElement, LabeledTextAreaProps>(
  ({ label, outerProps, ...props }, ref) => {
    const {
      register,
      formState: { isSubmitting },
      errors,
      handleSubmit,
    } = useFormContext()
    const error = Array.isArray(errors[props.name])
      ? errors[props.name].join(", ")
      : errors[props.name]?.message || errors[props.name]

    const yolobolo = useFormContext()

    console.log(yolobolo)

    const sumbitOnEnter: SumbitOnEnter = (e) => {
      // 13 represents the Enter key
      if (e.code === "Enter" && !e.shiftKey) {
        // Don't generate a new line
        e.preventDefault()

        handleSubmit((d) => console.log(d))()
      }
    }

    return (
      <div {...outerProps}>
        <label>
          {label}
          <Textarea
            isDisabled={isSubmitting}
            resize="none"
            onKeyDown={(e) => sumbitOnEnter(e)}
            {...props}
            ref={register}
          />
        </label>

        {error && (
          <div role="alert" style={{ color: "red" }}>
            {error}
          </div>
        )}

        <style jsx>{`
          label {
            display: flex;
            flex-direction: column;
            align-items: start;
            font-size: 1rem;
          }
          input {
            font-size: 1rem;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            border: 1px solid purple;
            appearance: none;
            margin-top: 0.5rem;
          }
        `}</style>
      </div>
    )
  }
)

export default LabeledTextArea

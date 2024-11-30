import { getCacheManager } from "@/lib/cache/cache.client";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Form } from "react-router";
import { z } from "zod";
import { Button } from "../atoms/button";
import { Input } from "../atoms/input";

export let DeleteROM = z.object({
  id: z.number(),
  intent: z.literal("delete-rom"),
});

export type DeleteROM = z.infer<typeof DeleteROM>;

export function DeleteROMForm({ id }: { id: number }) {
  let [form, fields] = useForm({
    constraint: getZodConstraint(DeleteROM),
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: DeleteROM,
      });
    },
    defaultValue: {
      id,
    },
  });

  return (
    <Form
      {...getFormProps(form)}
      method="POST"
      onSubmit={async (e) => {
        if (!confirm("Are you sure you want to delete this rom?")) {
          e.preventDefault();
          await getCacheManager().clearAll();
          return;
        }
      }}
    >
      <Input {...getInputProps(fields.id, { type: "hidden" })} />
      <Button
        variant="destructive"
        type="submit"
        name="intent"
        value="delete-rom"
      >
        Delete game permanently
      </Button>
    </Form>
  );
}

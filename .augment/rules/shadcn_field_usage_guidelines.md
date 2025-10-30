---
type: "agent_requested"
description: "ChatGPT said:  Whenever you're implementing or refactoring form fields using Shadcn components, please refer to this guideline to ensure you're using the Field component correctly and consistently."
---

# Shadcn Field Component Usage Guidelines

## Overview

To maintain consistency and accessibility in our UI, always use the `Field` component from shadcn/ui instead of the deprecated `FormField` or `Form` components. For detailed usage patterns and examples, refer to the Shadcn MCP.

## Accessing the MCP

To view the latest documentation and examples for the `Field` component:

- Visit the Shadcn MCP: [https://ui.shadcn.com/docs/mcp](https://ui.shadcn.com/docs/mcp)

- Search for the `Field` component to find its usage patterns, examples, and metadata.

## Usage Patterns

When implementing the `Field` component:

1. **Labeling:** Use `<FieldLabel>` to define the label for the input field.
2. **Control:** Wrap the input component inside `<FieldControl>`.
3. **Description:** Optionally, provide additional information using `<FieldDescription>`.
4. **Message:** Display validation messages with `<FieldMessage>`.

Ensure that each part is correctly implemented to maintain accessibility and functionality.

## Deprecated Components

Avoid using the following deprecated components:

- `FormField`
- `FormItem`
- `FormLabel`
- `FormControl`
- `FormDescription`
- `FormMessage`

These components are no longer supported and should be replaced with the `Field` component as per the latest guidelines.

## Conclusion

For the most accurate and up-to-date information on using the `Field` component, always refer to the Shadcn MCP. This will ensure that your implementations are consistent with the latest standards and practices.

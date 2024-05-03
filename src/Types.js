// @ts-check

import * as React from "react";
import _ObjectId from "bson-objectid";
import { parseISO } from "date-fns";
import {
  Type as _Type,
  Kind,
  TypeRegistry,
  FormatRegistry,
} from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import {
  SetErrorFunction,
  DefaultErrorFunction,
  ValueErrorType,
} from "@sinclair/typebox/errors";

// =============================
// Types
// =============================

/**
 * @typedef {import("@sinclair/typebox/value").ValueErrorIterator} ValueErrorIterator
 * @typedef {import("@sinclair/typebox/value").ValueError} ValueError
 * @typedef {import("@sinclair/typebox").UnsafeOptions} UnsafeOptions
 */

// =============================
// Add custom string formats
// =============================

FormatRegistry.Set("date", (value) => {
  try {
    parseISO(value);
    const matchesOnlyDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value);

    if (!matchesOnlyDate) {
      console.warn(
        `"${value}" is a valid \`date-time\` but not \`date\`, did you mean to use \`date-time\`?`
      );
    }

    return matchesOnlyDate;
  } catch {
    return false;
  }
});

FormatRegistry.Set("date-time", (value) => {
  try {
    parseISO(value);
    return true;
  } catch {
    return false;
  }
});

// =============================
// Add custom types
// =============================

// Register ReactNode
TypeRegistry.Set(
  "ReactNode",
  (_, value) =>
    value === null ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "function" ||
    (typeof value === "object" && value instanceof React.Component)
);

/** @type {(options?: UnsafeOptions & {errorMessage?: string}) => ReturnType<typeof Type.Unsafe<React.ReactNode>>} */
const ReactNode = (options = {}) =>
  _Type.Unsafe({ ...options, [Kind]: "ReactNode" });

// Register Numeric
TypeRegistry.Set("NumericValue", (_, value) => toNumber(value) !== undefined);
/** @type {(options?: UnsafeOptions & {errorMessage?: string}) => ReturnType<typeof Type.Unsafe<number | string>>} */
const NumericValue = (options = {}) =>
  _Type.Unsafe({ ...options, [Kind]: "NumericValue" });

// Register ObjectId
TypeRegistry.Set("ObjectId", (_, value) => {
  if (!value) return false;

  try {
    return _ObjectId.isValid(/** @type {any} */ (value));
  } catch {
    return false;
  }
});

/** @type {(options?: UnsafeOptions & {errorMessage?: string}) => ReturnType<typeof Type.Unsafe<_ObjectId>>} */
const ObjectId = (options = {}) =>
  _Type.Unsafe({ ...options, [Kind]: "ObjectId" });

// =============================
// Add custom errors
// =============================

const quickValue = (value) => {
  if (value === null) return null;
  if (value === undefined) return "undefined";
  if (!value) return value;
  let result = value.toString();

  if (typeof value === "object") {
    try {
      result = JSON.stringify(value);
    } catch {}
  }
  return result;
};

SetErrorFunction((error) => {
  if ("errorMessage" in error.schema) return error.schema.errorMessage;

  switch (error.errorType) {
    case ValueErrorType.ObjectRequiredProperty:
      return "is missing";
    default:
      return [
        DefaultErrorFunction(error),
        "value" in error && `not ${quickValue(error.value)}`,
      ]
        .filter(Boolean)
        .join(" ");
  }
});

// =============================
// PropType function
// =============================

/**
 * @param {ValueError[]} errors
 */
function formatErrors(errors) {
  const allErrors = [...errors];

  const indexedErrors = allErrors.reduce((acc, $error) => {
    if (!acc[$error.path]) {
      acc[$error.path] = new Set();
    }

    acc[$error.path].add($error.message);

    return acc;
  }, /** @type {{[key: string]: Set<string>}}*/ ({}));

  const entries = Object.entries(indexedErrors);

  const formattedErrors = entries
    .map(
      ([$path, $messages]) =>
        `- "${$path.slice(1)}" ${Array.from($messages).join(" and ")}`
    )
    .join("\n");

  return formattedErrors;
}

export function toPropTypes($Type) {
  if (process.env.NODE_ENV === "development" && $Type) {
    class PropsError extends Error {
      /**
       * @param {{componentName: string, errors: ValueErrorIterator }} input
       */
      constructor({ componentName, errors }) {
        const allErrors = [...errors];
        const formattedErrors = formatErrors(allErrors);
        const message = `${componentName} component has invalid props. \n\n${formattedErrors}\n\n${allErrors
          .map(({ type, ...rest }) => JSON.stringify(rest))
          .join("\n")}`;

        super(message);
      }
    }
    return {
      key: function validateProps(props, _, componentName) {
        if (!Value.Check($Type, props)) {
          return new PropsError({
            componentName,
            errors: Value.Errors($Type, props),
          });
        }
      },
    };
  }
}

// =============================
// Export
// =============================

export const Type = Object.assign({}, _Type, {
  ReactNode,
  NumericValue,
  ObjectId,
});

// =============================
// Helpers
// =============================

/**
 * Attempts to convert a value into a number
 * @param {any} value
 * @returns The number or undefined if a failure
 */
export function toNumber(value) {
  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const result = parseFloat(value);
  return Number.isNaN(result) ? undefined : result;
}

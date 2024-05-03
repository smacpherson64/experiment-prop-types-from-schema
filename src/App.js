// @ts-check
import * as React from "react";
import { Type, toPropTypes } from "./Types";
import ObjectID from "bson-objectid";

// =============================
// Example component
// =============================

const User = () =>
  Type.Object({
    id: Type.ObjectId(),
    name: Type.String(),
    createdAt: Type.Date(),
    title: Type.String(),
  });

const Shipment = () =>
  Type.Object({
    id: Type.ObjectId(),
    sub: Type.Object({
      array: Type.Array(Type.Pick(User(), ["id", "name", "createdAt"])),
    }),
  });

const AppProps = Type.Object({
  shipment: Shipment(),
  id: Type.String(),
  name: Type.String(),
  value: Type.NumericValue(),
  children: Type.ReactNode(),
  onClick: Type.Function([], Type.Void()),
  clickedAt: Type.Date({ errorMessage: "abc" }),
  timestamp: Type.String({
    format: "date",
  }),
});

/**
 * @param {import('@sinclair/typebox').Static<typeof AppProps>} props
 */
function Example(props) {
  return (
    <div>
      Hi there {props.name}!<br />
      Seems like you have an id of {props.id}{" "}
      <pre>{JSON.stringify(props.shipment, null, 2)}</pre>
      {props.children}
    </div>
  );
}

Example.propTypes = toPropTypes(AppProps);

// =============================
// App component
// =============================

export default function App() {
  const shipment = {
    id: ObjectID(),
    sub: {
      array: [{ id: ObjectID(), name: "John Doe", createdAt: new Date() }],
    },
  };

  return (
    <Example
      shipment={shipment}
      id="000000000000000000000000"
      name="test"
      value={0}
      onClick={() => void 0}
      clickedAt={new Date(5)}
      timestamp={new Date().toISOString().slice(0, 10)}
    >
      Here is the child ReactNode you requested.
    </Example>
  );
}

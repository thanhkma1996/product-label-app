import { json } from "@remix-run/node";
import { createSchema, createYoga } from "graphql-yoga";
import prisma from "../db.server";

const typeDefs = /* GraphQL */ `
  type Label {
    id: ID!
    productId: String!
    text: String!
    background: String!
    position: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    labels(productId: String!): [Label!]!
  }

  type Mutation {
    createLabel(productId: String!, text: String!, background: String!, position: String!): Label!
    updateLabel(id: ID!, text: String, background: String, position: String): Label!
    deleteLabel(id: ID!): Boolean!
  }
`;

const resolvers = {
  Query: {
    labels: async (_parent, { productId }) => {
      return prisma.label.findMany({ where: { productId } });
    },
  },
  Mutation: {
    createLabel: async (_parent, { productId, text, background, position }) => {
      return prisma.label.create({
        data: { productId, text, background, position },
      });
    },
    updateLabel: async (_parent, { id, text, background, position }) => {
      return prisma.label.update({
        where: { id },
        data: { text, background, position },
      });
    },
    deleteLabel: async (_parent, { id }) => {
      await prisma.label.delete({ where: { id } });
      return true;
    },
  },
};

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/label",
  fetchAPI: { Response },
});

export const loader = async (args) => yoga.handleRequest(args.request, args);
export const action = async (args) => yoga.handleRequest(args.request, args); 
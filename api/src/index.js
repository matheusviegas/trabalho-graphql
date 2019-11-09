const { ApolloServer, gql, PubSub } = require("apollo-server");
const Sequelize = require("./database");
const User = require("./models/user");
const RegisteredTime = require("./models/registeredTime");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AuthDirective = require("./directives/auth");

const pubSub = new PubSub();

const typeDefs = gql`
  enum RoleEnum {
    ADMIN
    EMPLOYEE
  }

  directive @auth(role: [RoleEnum]) on OBJECT | FIELD_DEFINITION

  type User {
    id: ID!
    name: String!
    email: String!
    password: String!
    role: RoleEnum
    times: [RegisteredTime]
  }

  type RegisteredTime {
    id: ID!
    time_registered: String!
    user: User!
  }

  type Query {
    allUsers: [User] @auth(role: [ADMIN])
    allTimes: [RegisteredTime] @auth(role: [EMPLOYEE, ADMIN])
    myTimes: [RegisteredTime] @auth(role: [EMPLOYEE])
  }

  type Mutation {
    createRegisteredTime(data: CreateRegisteredTimeInput): RegisteredTime
      @auth(role: [EMPLOYEE])
    updateRegisteredTime(
      id: ID!
      data: UpdateRegisteredTimeInput
    ): RegisteredTime @auth(role: [ADMIN])
    deleteRegisteredTime(id: ID!): Boolean @auth(role: [ADMIN])

    createUser(data: CreateUserInput): User
    updateUser(id: ID!, data: UpdateUserInput): User
    deleteUser(id: ID!): Boolean

    signin(email: String!, password: String!): PayloadAuth
  }

  type PayloadAuth {
    token: String!
    user: User!
  }

  type Subscription {
    onRegisteredTime: RegisteredTime
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role: RoleEnum!
  }

  input UpdateUserInput {
    name: String
    email: String
    password: String
    role: RoleEnum
  }

  input CreateRegisteredTimeInput {
    time_registered: String!
  }

  input UpdateRegisteredTimeInput {
    time_registered: String
  }
`;

const resolver = {
  Query: {
    /*allTimes() {
      return RegisteredTime.findAll({ include: [User] });
    },*/
    async allUsers() {
      return await User.findAll({ include: [RegisteredTime] });
    },
    async allTimes(parent, body, context, info) {
      const { userId: id } = context;

      const userBD = await User.findByPk(id);

      if (userBD && userBD.role === "ADMIN") {
        return RegisteredTime.findAll({ include: [User] });
      } else {
        return RegisteredTime.findAll({
          include: [
            {
              association: "user",
              where: {
                id
              }
            }
          ]
        });
      }
    }
  },
  Mutation: {
    async createRegisteredTime(parent, body, context, info) {
      const user = await User.findOne({
        where: {
          id: context.userId
        }
      });

      if (user) {
        const time = await RegisteredTime.create(body.data);
        await time.setUser(user.get("id"));
        const updatedTime = time.reload({ include: [User] });

        pubSub.publish("registeredTime", {
          onRegisteredTime: updatedTime
        });

        return updatedTime;
      } else {
        throw new Error("Usuário não encontrado");
      }
    },
    async updateRegisteredTime(parent, body, context, info) {
      const time = await RegisteredTime.findOne({
        where: { id: body.id }
      });
      if (!time) {
        throw new Error("Horário não encontrado");
      }
      const updatedTime = await time.update(body.data);
      return updatedTime;
    },
    async deleteRegisteredTime(parent, body, context, info) {
      const time = await RegisteredTime.findOne({
        where: { id: body.id }
      });
      await time.destroy();
      return true;
    },
    async createUser(parent, body, context, info) {
      body.data.password = await bcrypt.hash(body.data.password, 10);
      const user = await User.create(body.data);
      const reloadedUser = user.reload({ include: [RegisteredTime] });
      return reloadedUser;
    },
    async updateUser(parent, body, context, info) {
      if (body.data.password) {
        body.data.password = await bcrypt.hash(body.data.password, 10);
      }
      const user = await User.findOne({
        where: { id: body.id }
      });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }
      const updateUser = await user.update(body.data);
      return updateUser;
    },
    async deleteUser(parent, body, context, info) {
      const user = await User.findOne({
        where: { id: body.id }
      });
      await user.destroy();
      return true;
    },
    async signin(parent, body, context, info) {
      const user = await User.findOne({
        where: { email: body.email }
      });

      if (user) {
        const isCorrect = await bcrypt.compare(body.password, user.password);
        if (!isCorrect) {
          throw new Error("Senha inválida");
        }

        const token = jwt.sign({ id: user.id }, "secret");

        return {
          token,
          user
        };
      }
    }
  },
  Subscription: {
    onRegisteredTime: {
      subscribe: () => pubSub.asyncIterator("registeredTime")
    }
  }
};

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolver,
  schemaDirectives: {
    auth: AuthDirective
  },
  context({ req }) {
    return {
      headers: req ? req.headers : {}
    };
  }
});

Sequelize.sync().then(() => {
  server.listen().then(() => {
    console.log("Servidor rodando");
  });
});

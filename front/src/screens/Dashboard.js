import React, { useState, useEffect } from "react";
import { Table, Button } from "antd";
import { useQuery, useMutation, useSubscription } from "react-apollo";
import gql from "graphql-tag";

const columns = [
  {
    title: "Nome",
    dataIndex: "user.name",
    key: "name"
  },
  {
    title: "Email",
    dataIndex: "user.email",
    key: "email"
  },
  {
    title: "Hora",
    dataIndex: "time_registered",
    key: "role"
  }
];

export default function Dashboard() {
  const [loggedUser, setLoggedUser] = useState(null);

  useEffect(() => {
    const userFromStorage = localStorage.getItem("user");
    if (userFromStorage) {
      setLoggedUser(JSON.parse(userFromStorage));
    }
  }, []);

  const { data, loading, refetch, updateQuery } = useQuery(gql`
    query allTimes {
      allTimes {
        id
        time_registered
        user {
          id
          name
          email
        }
      }
    }
  `);

  const [mutate] = useMutation(gql`
    mutation createRegisteredTime($data: CreateRegisteredTimeInput!) {
      createRegisteredTime(data: $data) {
        id
        time_registered
        user {
          id
          name
          email
        }
      }
    }
  `);

  const registrarPonto = async () => {
    const { data } = await mutate({
      variables: {
        data: {
          time_registered: new Date().toString()
        }
      }
    });

    if (data.createRegisteredTime) {
      refetch();
      alert("Criado com sucesso!");
    }
  };

  useSubscription(
    gql`
      subscription {
        onRegisteredTime {
          id
          time_registered
          user {
            id
            name
            email
          }
        }
      }
    `,
    {
      onSubscriptionData({ subscriptionData }) {
        updateQuery(prev => {
          if (!subscriptionData.data) {
            return prev;
          }

          return Object.assign({}, prev, {
            allTimes: [...prev.allTimes, subscriptionData.data.onRegisteredTime]
          });
        });
      }
    }
  );

  return (
    <>
      {loggedUser && loggedUser.role === "EMPLOYEE" && (
        <Button
          type="primary"
          onClick={registrarPonto}
          style={{ marginBottom: 16 }}>
          Registrar Ponto
        </Button>
      )}
      <Table
        dataSource={data && data.allTimes}
        columns={columns}
        pagination={false}
      />
    </>
  );
}

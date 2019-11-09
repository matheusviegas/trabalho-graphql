import React, { useState } from "react";
import { Table, Button } from "antd";
import ModalCreateBook from "../components/ModalCreateBook";
import { useQuery } from "react-apollo";
import gql from "graphql-tag";

const dataSource = [
  {
    id: "1",
    name: "Teste",
    email: "teste@gmail.com",
    role: "2019-05-05"
  }
];

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

export default function Books() {
  const [active, setActive] = useState(false);

  const { data, loading } = useQuery(gql`
    query allTimes {
      allTimes {
        id
        time_registered
        user {
          id
          name
          email
          role
        }
      }
    }
  `);

  return (
    <>
      <Button
        type="primary"
        onClick={() => setActive(true)}
        style={{ marginBottom: 16 }}>
        Adicionar
      </Button>
      <Table
        dataSource={data && data.allTimes}
        columns={columns}
        pagination={false}
      />
      <ModalCreateBook active={active} setActive={setActive} />
    </>
  );
}

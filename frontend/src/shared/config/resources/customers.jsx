
export const customersResource = {
  title: "Customers / Sites",
  endpoint: "customers",
  blank: {
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: ""
  },
  fields: [{
    key: "name",
    label: "Customer / Site Name"
  }, {
    key: "contact_person",
    label: "Responsible Person"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "address",
    label: "Address",
    type: "textarea"
  }],
  columns: [{
    key: "name",
    label: "Customer / Site"
  }, {
    key: "contact_person",
    label: "Responsible"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "address",
    label: "Address"
  }]
};

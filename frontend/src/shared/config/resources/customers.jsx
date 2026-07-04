
export const customersResource = {
  title: "Customers / Locations",
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
    label: "Customer / Location Name"
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
    label: "Customer / Location"
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

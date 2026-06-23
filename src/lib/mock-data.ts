export const CRM_FIELDS = [
  "Full Name",
  "Email Address",
  "Phone Number",
  "Company",
  "Job Title",
  "Status",
  "Last Contacted",
  "Lead Source",
  "Deal Value",
  "Notes"
];

export interface RowData {
  id: string;
  [key: string]: string;
}

export interface SheetStructure {
  sheetName: string;
  headers: string[];
  rows: RowData[];
}

export const INITIAL_SHEETS: SheetStructure[] = [
  {
    sheetName: "Leads_2024",
    headers: ["Client Name", "Contact Email", "Ph", "Organization", "Lead Status", "Acquisition Channel"],
    rows: [
      { id: "1", "Client Name": "Alex Rivers", "Contact Email": "alex@rivers.com", "Ph": "555-0101", "Organization": "Rivers Corp", "Lead Status": "New", "Acquisition Channel": "Website" },
      { id: "2", "Client Name": "Sam Morgan", "Contact Email": "sam@morgan.net", "Ph": "555-0102", "Organization": "Morgan Logistics", "Lead Status": "In Progress", "Acquisition Channel": "LinkedIn" },
      { id: "3", "Client Name": "Jordan Lee", "Contact Email": "jordan@lee.io", "Ph": "555-0103", "Organization": "Lee Tech", "Lead Status": "Qualified", "Acquisition Channel": "Referral" },
    ]
  },
  {
    sheetName: "Archived_Customers",
    headers: ["Name", "Email", "Phone", "Company", "Contract Value"],
    rows: [
      { id: "101", "Name": "Maria Garcia", "Email": "maria@garcia.com", "Phone": "555-0201", "Company": "Garcia & Sons", "Contract Value": "$5,000" },
    ]
  }
];
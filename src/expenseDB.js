import IDBWrapper from "./idb";

const expenseDB = new IDBWrapper("ExpenseTrackerDB", "expenses");

export default expenseDB;

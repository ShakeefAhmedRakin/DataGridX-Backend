// models.js
const mongoose = require("mongoose");

// Schema for a single table cell
const cellSchema = new mongoose.Schema({
  value: { type: String, default: "" }, // Editable cell value
  isEditable: { type: Boolean, default: true }, // Whether the cell is editable
  nestedTable: { type: mongoose.Schema.Types.ObjectId, ref: "Table" }, // Reference to a nested table
});

// Schema for a row that contains an array of cells
const rowSchema = new mongoose.Schema({
  cells: [cellSchema], // Array of cells in the row
});

// Schema for a table, which contains rows
const tableSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Table name
  rows: [rowSchema], // Array of rows in the table
  parentCell: { type: mongoose.Schema.Types.ObjectId, ref: "Cell" }, // If this is a nested table, reference to the parent cell
  createdAt: { type: Date, default: Date.now }, // Date of table creation
  updatedAt: { type: Date, default: Date.now }, // Date of last update
  email: { type: String, required: true }, // Email of the user who created the table
});

// Schema for a page, which contains multiple tables
const pageSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Page name
  tables: [{ type: mongoose.Schema.Types.ObjectId, ref: "Table" }], // Array of tables on the page
  createdAt: { type: Date, default: Date.now }, // Date of page creation
  updatedAt: { type: Date, default: Date.now }, // Date of last update
});

// Export the schemas as models
const Cell = mongoose.model("Cell", cellSchema);
const Row = mongoose.model("Row", rowSchema);
const Table = mongoose.model("Table", tableSchema);
const Page = mongoose.model("Page", pageSchema);

module.exports = { Cell, Row, Table, Page };

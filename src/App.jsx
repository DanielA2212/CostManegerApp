import {useState, useEffect} from "react";
import {Chart} from "chart.js/auto";
import {Button, TextField, MenuItem, Box, Typography, Paper, Grid, Container} from "@mui/material";
import {createTheme, ThemeProvider, styled} from "@mui/material/styles";
import IDBWrapper from "./idb";

const expenseDB = new IDBWrapper("ExpenseTrackerDB", "expenses");

//font and background colors for buttons
const theme = createTheme({
    palette: {
        primary: {
            main: "#4caf50", // Green
            dark: "#434d55",
        },
        secondary: {
            main: "#ffffff", // White
        },
    },
});



const StyledButton = styled(Button)(({ theme, variant }) => ({
    ...(variant === "delete" && {
        backgroundColor: theme.palette.secondary.main,
        color: "Maroon",
        border: `1px solid ${"Maroon"}`,
        '&:hover': {
            backgroundColor: "Maroon", // Dark red on hover
            color: "white",
            border: `1px solid ${"Maroon"}`,
        },
    }),
    ...(!variant && {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.primary.main,
        border: `1px solid ${theme.palette.primary.main}`,
        '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.secondary.main,
        },
    }),
}));

// Custom styled TextField
const StyledTextField = styled(TextField)(({theme}) => ({
    '& .MuiInputLabel-root': {
        color: theme.palette.primary.main, // Label color
    },
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: theme.palette.primary.main, // Border color
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.dark, // Border color on hover
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main, // Border color when focused
        },
    },
    '& .MuiInputBase-input': {
        color: theme.palette.primary.main, // Input text color
    },
}));

const ExpenseTracker = () => {
    const [formData, setFormData] = useState({
        amount: "",
        category: "food",
        description: "",
        date: "",
    });
    const [monthYear, setMonthYear] = useState("");
    const [expenses, setExpenses] = useState([]);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [pieChart, setPieChart] = useState(null);

    const CATEGORIES = {
        food: "Food",
        transportation: "Transportation",
        utilities: "Utilities",
        entertainment: "Entertainment",
        other: "Other",
    };

    const CHART_COLORS = {
        food: "#cc184e",
        transportation: "#0066cc",
        utilities: "#f18e04",
        entertainment: "#0d6b10",
        other: "#6619b5",
    };

    const showMessage = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const addExpense = async (e) => {
        e.preventDefault();
        try {
            if (!formData.amount || formData.amount <= 0) {
                throw new Error("Amount Must Be Greater Than 0");
            }
            if (!formData.description.trim()) {
                throw new Error("Description is required");
            }
            if (!formData.date) {
                throw new Error("Date is required");
            }
            const newExpense = { ...formData, amount: parseFloat(formData.amount) };
            const id = await expenseDB.save(newExpense);
            const updatedExpenses = [...expenses, {
                ...newExpense,
                id
            }].sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpenses(updatedExpenses);
            setFormData({ amount: "", category: "food", description: "", date: "" });
            showMessage("Expense Added Successfully!");
        } catch (error) {
            showMessage(error.message, "Error");
        }
    };

    const deleteExpense = async (id) => {
        if (window.confirm("Are You Sure You Want To Delete This Expense?")) {
            await expenseDB.delete(id);
            const updatedExpenses = expenses.filter((expense) => expense.id !== id);
            setExpenses(updatedExpenses);
            showMessage("Expense Deleted Successfully!");
        }
    };

    useEffect(() => {
        const fetchExpenses = async () => {
            const storedExpenses = await expenseDB.getAll();
            const sortedExpenses = storedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpenses(sortedExpenses);
        };
        fetchExpenses();
    }, []);

    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        setIsDarkMode(mediaQuery.matches);

        const handleChange = (e) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);


    // Filter expenses based on the selected month and year
    const filteredExpenses = monthYear
        ? expenses.filter((expense) => {
            const expenseDate = new Date(expense.date);
            const [year, month] = monthYear.split("-").map(Number);
            return (
                expenseDate.getFullYear() === year &&
                expenseDate.getMonth() === month - 1
            );
        })
        : [];

    // Update pie chart whenever expenses or Month And Year changes
    useEffect(() => {
        if (monthYear) {
            const categoryTotals = filteredExpenses.reduce((acc, expense) => {
                acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
                return acc;
            }, {});

            const data = {
                labels: Object.keys(categoryTotals).map((key) => CATEGORIES[key]),
                datasets: [
                    {
                        data: Object.values(categoryTotals),
                        backgroundColor: Object.keys(categoryTotals).map((key) => CHART_COLORS[key]),
                    },
                ],
            };

            if (pieChart) {
                // Update the existing chart data
                pieChart.data = data;
                pieChart.update();
            } else {
                // Create a new chart if it doesn't exist
                const ctx = document.getElementById("pieChart").getContext("2d");
                const newPieChart = new Chart(ctx, {
                    type: "pie",
                    data: data,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: "top",
                            },
                            tooltip: {
                                callbacks: {
                                    title: () => null, // Disable the title in the tooltip
                                    label: function (context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        return `${label}: $${value.toFixed(2)}`; // Add dollar sign and format to 2 decimal places
                                    },
                                },
                            },
                        },
                    },
                });
                setPieChart(newPieChart);
            }
        }
    }, [expenses, monthYear]); // Only update when expenses or monthYear changes

    // Cleanup the chart when expense removed
    useEffect(() => {
        return () => {
            if (pieChart) {
                pieChart.destroy();
            }
        };
    }, [pieChart]);

    return (
        <ThemeProvider theme={theme}>
            <Container>
                <Box p={4}>
                    <Typography variant="h4" gutterBottom>Expense Tracker</Typography>

                    {message.text && (
                        <Typography
                            variant="h6"
                            style={{
                                color: message.type === "error" ? "red" : "limegreen",
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                            }}
                        >
                            {message.text}
                        </Typography>
                    )}

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} style={{ padding: "20px" }}>
                                <Typography variant="h5" gutterBottom>Add New Expense</Typography>
                                <form onSubmit={addExpense}>
                                    <StyledTextField
                                        fullWidth
                                        margin="normal"
                                        label="Amount"
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        required
                                        inputProps={{ step: "0.01", min: "0" }}
                                    />
                                    <StyledTextField
                                        fullWidth
                                        margin="normal"
                                        select
                                        label="Category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        {Object.keys(CATEGORIES).map((key) => (
                                            <MenuItem key={key} value={key}>
                                                {CATEGORIES[key]}
                                            </MenuItem>
                                        ))}
                                    </StyledTextField>
                                    <StyledTextField
                                        fullWidth
                                        margin="normal"
                                        label="Description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <StyledTextField
                                        fullWidth
                                        margin="normal"
                                        label="Date"
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                                color: theme.palette.primary.dark, // Change the color of the calendar icon
                                                filter: isDarkMode ? 'invert(1)':'invert(0)', //inverts the calendar icon color for dark mode
                                            },
                                            '& input[type="date"]::-webkit-inner-spin-button, & input[type="date"]::-webkit-clear-button': {
                                                display: 'none', // Hide the spin and clear buttons
                                            },
                                        }}
                                    />
                                    <StyledButton type="submit" fullWidth>
                                        Add Expense
                                    </StyledButton>
                                </form>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} style={{ padding: "20px" }}>
                                <Typography variant="h5" gutterBottom>View Expenses</Typography>
                                <StyledTextField
                                    fullWidth
                                    margin="normal"
                                    label="Select Month and Year"
                                    type="month"
                                    value={monthYear}
                                    onChange={(e) => setMonthYear(e.target.value)}
                                    sx={{
                                        '& input[type="month"]::-webkit-calendar-picker-indicator': {
                                            color: theme.palette.primary.dark, // Change the color of the calendar icon
                                            filter: isDarkMode ? 'invert(1)':'invert(0)', //inverts the calendar icon color for dark mode
                                        },
                                        '& input[type="month"]::-webkit-inner-spin-button, & input[type="month"]::-webkit-clear-button': {
                                            display: 'none',
                                        },
                                        'input::-webkit-calendar-picker=indicator': {

                                        },
                                    }}
                                />

                                <Box mt={4}>
                                    {monthYear && filteredExpenses.length === 0 ? (
                                        <Typography variant="body1" style={{color: "gray"}}>
                                            No expenses for this month.
                                        </Typography>
                                    ) : (
                                        filteredExpenses.map((expense) => (
                                            <Box key={expense.id} mb={2}>
                                                <Typography
                                                    variant="body1"
                                                    style={{color: CHART_COLORS[expense.category]}} // Apply color to category text
                                                >
                                                    {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(expense.date))}:
                                                    ${expense.amount.toFixed(2)} - {CATEGORIES[expense.category]} ({expense.description})
                                                </Typography>
                                                <StyledButton
                                                    onClick={() => deleteExpense(expense.id)}
                                                    fullWidth
                                                    variant="delete"
                                                >
                                                    Delete
                                                </StyledButton>
                                            </Box>
                                        ))
                                    )}
                                </Box>
                                <canvas id="pieChart" style={{ marginTop: "20px" }}></canvas>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default ExpenseTracker;

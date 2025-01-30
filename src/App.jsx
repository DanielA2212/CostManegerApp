import {useState, useEffect} from "react";
import {Chart} from "chart.js/auto";
import {Button, TextField, MenuItem, Box, Typography, Paper, Grid, Container} from "@mui/material";
import {createTheme, ThemeProvider, styled} from "@mui/material/styles";

// Wait for IDB to be available
const waitForIDB = () => {
    return new Promise((resolve) => {
        const checkIDB = () => {
            if (window.idb) {
                resolve(window.idb);
            } else {
                setTimeout(checkIDB, 100); // Check every 100ms
            }
        };
        checkIDB();
    });
};

let db = null;

const theme = createTheme({
    palette: {
        primary: {
            main: "#4caf50",
            dark: "#434d55",
        },
        secondary: {
            main: "#ffffff",
        },
    },
});

const StyledButton = styled(Button)(({ theme, variant }) => ({
    ...(variant === "delete" && {
        backgroundColor: theme.palette.secondary.main,
        color: "Maroon",
        border: `1px solid ${"Maroon"}`,
        '&:hover': {
            backgroundColor: "Maroon",
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

const StyledTextField = styled(TextField)(({theme}) => ({
    '& .MuiInputLabel-root': {
        color: theme.palette.primary.main,
    },
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: theme.palette.primary.main,
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.dark,
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
        },
    },
    '& .MuiInputBase-input': {
        color: theme.palette.primary.main,
    },
}));

const ExpenseTracker = () => {
    const [formData, setFormData] = useState({
        sum: "",
        category: "FOOD",
        description: "",
        date: new Date().toISOString().split('T')[0]
    });
    const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7)); // Initialize with current month
    const [expenses, setExpenses] = useState([]);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [pieChart, setPieChart] = useState(null);
    const [isDbInitialized, setIsDbInitialized] = useState(false);

    const CATEGORIES = {
        FOOD: "Food",
        CAR: "Car",
        UTILITIES: "Utilities",
        ENTERTAINMENT: "Entertainment",
        OTHER: "Other",
    };

    const CHART_COLORS = {
        FOOD: "#cc184e",
        CAR: "#0066cc",
        UTILITIES: "#f18e04",
        ENTERTAINMENT: "#0d6b10",
        OTHER: "#6619b5",
    };

    const showMessage = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const fetchExpensesForMonth = async (selectedMonth) => {
        if (!db) return;

        try {
            const transaction = db.transaction('costs', 'readonly');
            const store = transaction.objectStore('costs');
            const request = store.getAll();

            request.onsuccess = () => {
                const allExpenses = request.result;
                // Filter expenses for selected month
                const [year, month] = selectedMonth.split('-');
                const filteredExpenses = allExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getFullYear() === parseInt(year) &&
                        expenseDate.getMonth() === parseInt(month) - 1;
                });
                setExpenses(filteredExpenses);
            };

            request.onerror = (event) => {
                console.error('Error fetching expenses:', event.target.error);
                showMessage('Error fetching expenses', 'error');
            };
        } catch (error) {
            console.error('Transaction error:', error);
            showMessage('Error fetching expenses', 'error');
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initDb = async () => {
            try {
                const idb = await waitForIDB();
                const database = await idb.openCostsDB("costsdb", 1);

                if (isMounted) {
                    db = database;
                    setIsDbInitialized(true);
                    // Fetch expenses for current month after DB is initialized
                    fetchExpensesForMonth(monthYear);
                }
            } catch (error) {
                console.error('Failed to initialize database:', error);
                if (isMounted) {
                    setMessage({
                        text: `Failed to initialize database: ${error.message}`,
                        type: "error"
                    });
                }
            }
        };

        initDb();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (isDbInitialized && monthYear) {
            fetchExpensesForMonth(monthYear);
        }
    }, [monthYear, isDbInitialized]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const addExpense = async (e) => {
        e.preventDefault();
        try {
            if (!isDbInitialized || !db) {
                throw new Error("Database not initialized. Please try again in a moment.");
            }
            if (!formData.sum || formData.sum <= 0) {
                throw new Error("Amount Must Be Greater Than 0");
            }
            if (!formData.description.trim()) {
                throw new Error("Description is required");
            }
            if (!formData.date) {
                throw new Error("Date is required");
            }

            const newExpense = {
                sum: parseFloat(formData.sum),
                category: formData.category,
                description: formData.description,
                date: formData.date
            };

            const result = await db.addCost(newExpense);

            if (result) {
                // Refresh expenses for the current month after adding
                await fetchExpensesForMonth(monthYear);
                setFormData({
                    sum: "",
                    category: "FOOD",
                    description: "",
                    date: new Date().toISOString().split('T')[0]
                });
                showMessage("Expense Added Successfully!");
            } else {
                throw new Error("Failed to add expense");
            }
        } catch (error) {
            showMessage(error.message, "error");
        }
    };

    useEffect(() => {
        // Destroy existing chart if it exists
        if (pieChart) {
            pieChart.destroy();
            setPieChart(null);
        }

        // Only create new chart if there are expenses
        if (monthYear && expenses.length > 0) {
            const categoryTotals = expenses.reduce((acc, expense) => {
                acc[expense.category] = (acc[expense.category] || 0) + expense.sum;
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

            const ctx = document.getElementById("pieChart")?.getContext("2d");
            if (ctx) {
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
                                    title: () => null,
                                    label: function (context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        return `${label}: ${value.toFixed(2)}`;
                                    },
                                },
                            },
                        },
                    },
                });
                setPieChart(newPieChart);
            }
        }
    }, [expenses, monthYear]);

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
                                        name="sum"
                                        value={formData.sum}
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
                                        {Object.entries(CATEGORIES).map(([key, value]) => (
                                            <MenuItem key={key} value={key}>
                                                {value}
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
                                    />
                                    <StyledButton
                                        type="submit"
                                        fullWidth
                                        disabled={!isDbInitialized}
                                    >
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
                                    InputLabelProps={{ shrink: true }}
                                />

                                <Box mt={4}>
                                    {monthYear && expenses.length === 0 ? (
                                        <Typography variant="body1" style={{color: "gray"}}>
                                            No expenses for this month
                                        </Typography>
                                    ) : (
                                        <>
                                            {expenses.map((expense, index) => (
                                                <Box key={index} mb={2}>
                                                    <Typography
                                                        variant="body1"
                                                        style={{color: CHART_COLORS[expense.category]}}
                                                    >
                                                        {new Date(expense.date).toLocaleDateString()} - ${expense.sum.toFixed(2)} - {CATEGORIES[expense.category]} ({expense.description})
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {expenses.length > 0 && (
                                                <Box mt={4}>
                                                    <canvas id="pieChart"></canvas>
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default ExpenseTracker;
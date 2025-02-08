import {useState, useEffect, useMemo} from 'react';
import {Chart} from 'chart.js/auto';
import {Button, TextField, MenuItem, Box, Typography, Paper, Container, Grid} from '@mui/material';
import {createTheme, ThemeProvider, styled} from '@mui/material/styles';
import IDBWrapper from './idb';

const expenseDB = new IDBWrapper('ExpenseTrackerDB', 'expenses');

/**
 * Material-UI theme configuration for the expense tracker
 * Defines a custom theme with primary color (green) and secondary color (white)
 * Includes dark mode adjustments and hover states
 * @type {import('@mui/material').Theme}
 */
const theme = createTheme({
    palette: {
        primary: {
            main: '#4caf50', /* Green */
            dark: '#434d55',
        },
        secondary: {
            main: '#ffffff', /* White */
        },
    },
});

/**
 * Styled button component with custom variants for regular and delete actions
 * Handles different states (hover, active) and color schemes based on variant
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.theme - Material-UI theme object
 * @param {'delete' | undefined} props.variant - Button variant
 * @returns {JSX.Element} Styled button component
 */
const StyledButton = styled(Button)(({ theme, variant }) => ({
    ...(variant === 'delete' && {
        backgroundColor: theme.palette.secondary.main,
        color: 'Maroon',
        border: `1px solid Maroon`,
        '&:hover': {
            backgroundColor: 'Maroon', /* Dark red on hover */
            color: 'white',
            border: `1px solid Maroon`,
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

/* Custom styled TextField */
const StyledTextField = styled(TextField)(({theme}) => ({
    '& .MuiInputLabel-root': {
        color: theme.palette.primary.main, /* Label color */
    },
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: theme.palette.primary.main, /* Border color */
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.dark, /* Border color on hover */
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main, /* Border color when focused */
        },
    },
    '& .MuiInputBase-input': {
        color: theme.palette.primary.main, /* Input text color */
    },
}));

/**
 * Main ExpenseTracker component that handles expense management and visualization
 * @component
 * @returns {JSX.Element} ExpenseTracker component
 */
const ExpenseTracker = () => {
    const [formData, setFormData] = useState({
        amount: '',
        category: 'food',
        description: '',
        date: '',
    });
    const [monthYear, setMonthYear] = useState('');
    const [expenses, setExpenses] = useState([]);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [pieChart, setPieChart] = useState(null);

    const CATEGORIES = useMemo(() => ({
        food: 'Food',
        transportation: 'Transportation',
        utilities: 'Utilities',
        entertainment: 'Entertainment',
        other: 'Other',
    }), []); // Empty dependency array since categories are constant

    const CHART_COLORS = useMemo(() => ({
        food: '#cc184e',
        transportation: '#0066cc',
        utilities: '#f18e04',
        entertainment: '#0d6b10',
        other: '#6619b5',
    }), []); // Empty dependency array since colors are constant

    /**
     * Displays a temporary message to the user with optional type styling
     * @param {string} text - Message content to display
     * @param {'success' | 'error'} [type='success'] - Message type that determines styling
     * @returns {void}
     */
    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    /**
     * Handles form submission to add a new expense
     * Validates input data and updates database and UI state
     * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
     * @returns {Promise<void>}
     * @throws {Error} When validation fails or database operation fails
     */
    const addExpense = async (e) => {
        e.preventDefault();
        try {
            if (!formData.amount || formData.amount <= 0) {
                showMessage('Amount Must Be Greater Than 0', 'error');
                return;
            }
            if (!formData.description.trim()) {
                showMessage('Description is required', 'error');
                return;
            }
            if (!formData.date) {
                showMessage('Date is required', 'error');
                return;
            }
            const newExpense = { ...formData, amount: parseFloat(formData.amount) };
            const id = await expenseDB.save(newExpense);
            const updatedExpenses = [...expenses, {
                ...newExpense,
                id
            }].sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpenses(updatedExpenses);
            setFormData({ amount: '', category: 'food', description: '', date: '' });
            showMessage('Expense Added Successfully!');
        } catch (error) {
            showMessage(error.message);
        }
    };

    /**
     * Deletes an expense from the database and updates the UI
     * Prompts for confirmation before deletion
     * @param {string|number} id - Unique identifier of the expense to delete
     * @returns {Promise<void>}
     */
    const deleteExpense = async (id) => {
        if (window.confirm('Are You Sure You Want To Delete This Expense?')) {
            await expenseDB.delete(id);
            const updatedExpenses = expenses.filter((expense) => expense.id !== id);
            setExpenses(updatedExpenses);
            showMessage('Expense Deleted Successfully!');
        }
    };

    /**
     * Fetches expenses from IndexedDB on component mount
     * Sorts expenses by date in descending order and updates state
     * @returns {Promise<void>}
     */
    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                const storedExpenses = await expenseDB.getAll();
                const sortedExpenses = storedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                setExpenses(sortedExpenses);
            } catch (error) {
                console.error('Error fetching expenses:', error);
                showMessage('Failed to load expenses', 'error');
            }
        };
        fetchExpenses().catch(error => {
            console.error('Error in fetchExpenses effect:', error);
            showMessage('Failed to load expenses', 'error');
        });
    }, []);

    /* Adjustments for dark and light mode of the browser */
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);

        const handleChange = (e) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    /* Filter expenses based on the selected month and year */
    const filteredExpenses = useMemo(() => {
        if (!monthYear) return [];
        return expenses.filter((expense) => {
            const expenseDate = new Date(expense.date);
            const [year, month] = monthYear.split('-').map(Number);
            return (
                expenseDate.getFullYear() === year &&
                expenseDate.getMonth() === month - 1
            );
        });
    }, [expenses, monthYear]);

    /**
     * Manages pie chart creation and updates
     * Creates a new chart instance or updates existing one based on filtered expenses
     * Handles chart data formatting and display options
     * @effect
     * @param {Array<Object>} filteredExpenses - Filtered expense data for selected month
     * @param {string} monthYear - Selected month and year
     * @returns {void}
     */
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
                /* Update the existing chart data */
                pieChart.data = data;
                pieChart.update();
            } else {
                /* Create a new chart if it doesn't exist */
                const ctx = document.getElementById('pieChart').getContext('2d');
                const newPieChart = new Chart(ctx, {
                    type: 'pie',
                    data: data,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        return `${label}: $${value.toFixed(2)}`;
                                    },
                                },
                            },
                        },
                    },
                });
                setPieChart(newPieChart);
            }
        }
    }, [expenses, monthYear, CATEGORIES, CHART_COLORS, filteredExpenses, pieChart]);

    /* Cleanup the chart when expense removed */
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
                    <Typography variant='h4' gutterBottom>Expense Tracker</Typography>

                    {message.text && (
                        <Typography
                            variant='h6'
                            style={{
                                color: message.type === 'error' ? 'red' : 'limegreen',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {message.text}
                        </Typography>
                    )}

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} style={{ padding: '20px' }}>
                                <Typography variant='h5' gutterBottom>Add New Expense</Typography>
                                <form onSubmit={addExpense}>
                                    <StyledTextField
                                        fullWidth
                                        margin='normal'
                                        label='Amount'
                                        type='number'
                                        name='amount'
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        required
                                        inputProps={{ step: '0.01', min: '0' }}
                                    />
                                    <StyledTextField
                                        fullWidth
                                        margin='normal'
                                        select
                                        label='Category'
                                        name='category'
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
                                        margin='normal'
                                        label='Description'
                                        name='description'
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <StyledTextField
                                        fullWidth
                                        margin='normal'
                                        label='Date'
                                        type='date'
                                        name='date'
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                                color: theme.palette.primary.dark,
                                                filter: isDarkMode ? 'invert(1)':'invert(0)',
                                            },
                                            '& input[type="date"]::-webkit-inner-spin-button, & input[type="date"]::-webkit-clear-button': {
                                                display: 'none',
                                            },
                                        }}
                                    />
                                    <StyledButton type='submit' fullWidth>
                                        Add Expense
                                    </StyledButton>
                                </form>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} style={{ padding: '20px' }}>
                                <Typography variant='h5' gutterBottom>View Expenses</Typography>
                                <StyledTextField
                                    fullWidth
                                    margin='normal'
                                    label='Select Month and Year'
                                    type='month'
                                    value={monthYear}
                                    onChange={(e) => setMonthYear(e.target.value)}
                                    sx={{
                                        '& input[type="month"]::-webkit-calendar-picker-indicator': {
                                            color: theme.palette.primary.dark,
                                            filter: isDarkMode ? 'invert(1)':'invert(0)',
                                        },
                                        '& input[type="month"]::-webkit-inner-spin-button, & input[type="month"]::-webkit-clear-button': {
                                            display: 'none',
                                        },
                                    }}
                                />

                                <Box mt={4}>
                                    {monthYear && filteredExpenses.length === 0 ? (
                                        <Typography variant='body1' style={{color: 'gray'}}>
                                            No expenses for this month
                                        </Typography>
                                    ) : (
                                        filteredExpenses.map((expense) => (
                                            <Box key={expense.id} mb={2}>
                                                <Typography
                                                    variant='body1'
                                                    style={{color: CHART_COLORS[expense.category]}}
                                                >
                                                    {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(expense.date))}:
                                                    ${expense.amount.toFixed(2)} - {CATEGORIES[expense.category]} ({expense.description})
                                                </Typography>
                                                <StyledButton
                                                    onClick={() => deleteExpense(expense.id)}
                                                    fullWidth
                                                    variant='delete'
                                                >
                                                    Delete
                                                </StyledButton>
                                            </Box>
                                        ))
                                    )}
                                </Box>
                                <canvas id='pieChart' style={{ marginTop: '20px' }}></canvas>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default ExpenseTracker;
document.addEventListener('DOMContentLoaded', function () {
    const last30DaysButton = document.getElementById('last30Days');
    const lastMonthButton = document.getElementById('lastMonth');
    const currentMonthButton = document.getElementById('currentMonth');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');

    last30DaysButton.addEventListener('click', function (event) {
        event.preventDefault();
        const today = new Date();
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);

        fromDateInput.value = formatDate(last30Days);
        toDateInput.value = formatDate(today);
    });

    lastMonthButton.addEventListener('click', function (event) {
        event.preventDefault();
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);

        const lastMonthFirstDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const lastMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);

        fromDateInput.value = formatDate(lastMonthFirstDay);
        toDateInput.value = formatDate(lastMonthLastDay);
    });

    currentMonthButton.addEventListener('click', function (event) {
        event.preventDefault();
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        fromDateInput.value = formatDate(firstDayOfMonth);
        toDateInput.value = formatDate(lastDayOfMonth);
    });

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const inputElement = document.querySelector('input[type="file"]');
    const pond = FilePond.create(inputElement);
    pond.setOptions({
        server: {
            url: '/file',
            process: {
                ondata: (formData) => {
                    formData.append('fromDate', fromDateInput.value);
                    formData.append('toDate', toDateInput.value);
                    return formData;
                },
                onload: (response) => {
                    const data = JSON.parse(response);
                    fromDateInput.value = data.minDate;
                    toDateInput.value = data.maxDate;
                    return data.fileId;
                }
            },
        }
    });

    pond.labelFileProcessingError = 'Invalid DKB CSV file';
});

document.getElementById('dateForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Get the values from the date fields
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;

    // Create a FormData object and append the values
    const formData = new FormData(this);
    formData.append('fromDate', fromDate);
    formData.append('toDate', toDate);

    console.log(formData);

    // Send the form data to the server using fetch or XMLHttpRequest
    // For example using fetch:
    fetch(this.action, {
        method: this.method,
        body: formData
    }).then(response => {
        return response.blob();
    }).then(blob => {
        download(blob, "YNAB.csv", "text/csv");
    }).catch(error => {
        console.error(error);
    });
});
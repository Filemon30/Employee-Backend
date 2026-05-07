CREATE TYPE gender_enum AS ENUM ('Male','Female');
CREATE TYPE attendance_status_enum AS ENUM ('Present','Late','Absent','Leave');

CREATE TABLE departments(
    department_id INT PRIMARY KEY,
    department_name VARCHAR(80) UNIQUE NOT NULL
);

CREATE TABLE salaries(
    salary_id INT PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0)
);

CREATE TABLE positions(
    position_id INT PRIMARY KEY,
    department_id INT NOT NULL,
    salary_id INT NOT NULL,
    position_name VARCHAR(80) NOT NULL,

    FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE CASCADE,

    FOREIGN KEY (salary_id)
        REFERENCES salaries(salary_id),

    UNIQUE (department_id, position_name)
);

CREATE TABLE cards(
    card_id INT PRIMARY KEY,
    card_number VARCHAR(120) UNIQUE NOT NULL
);

CREATE TABLE user_accounts(
    acc_id INT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE user_informations(
    info_id INT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    gender gender_enum NOT NULL,
    birthdate DATE NOT NULL,
    province VARCHAR(200) NOT NULL,
    city VARCHAR(200) NOT NULL,
    barangay VARCHAR(200) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    contact_number VARCHAR(20) NOT NULL
    suffix VARCHAR(20),
);

CREATE TABLE work_hours(
    work_hour_id INT PRIMARY KEY,
    time_in VARCHAR(20) NOT NULL,
    time_out VARCHAR(20) NOT NULL,
    CHECK (time_out > time_in)
);

CREATE TABLE employees(
    employee_id INT PRIMARY KEY,
    position_id INT NOT NULL,
    card_id INT UNIQUE NOT NULL,
    acc_id INT UNIQUE NOT NULL,
    info_id INT UNIQUE NOT NULL,
    work_hour_id INT NOT NULL,

    FOREIGN KEY (position_id)
        REFERENCES positions(position_id),

    FOREIGN KEY (card_id)
        REFERENCES cards(card_id)
        ON DELETE CASCADE,

    FOREIGN KEY (acc_id)
        REFERENCES user_accounts(acc_id)
        ON DELETE CASCADE,

    FOREIGN KEY (info_id)
        REFERENCES user_informations(info_id)
        ON DELETE CASCADE,

    FOREIGN KEY (work_hour_id)
        REFERENCES work_hours(work_hour_id)
);

CREATE TABLE attendances(
    attendance_id INT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_in TIME,
    time_out TIME,
    status attendance_status_enum NOT NULL,

    FOREIGN KEY (employee_id)
        REFERENCES employees(employee_id)
        ON DELETE CASCADE,

    UNIQUE (employee_id, attendance_date)
);

CREATE INDEX idx_attendance_employee_date
ON attendances(employee_id, attendance_date);

CREATE TABLE transactions(
    transaction_id INT PRIMARY KEY,
    transaction_type VARCHAR(80) NOT NULL,
    transacted_by INT NOT NULL,

    reference_type VARCHAR(30) NOT NULL, -- tells backend where to put ID

    department_id INT,
    position_id INT,
    salary_id INT,
    work_hour_id INT,
    employee_id INT,

    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transacted_by)
        REFERENCES employees(employee_id),

    FOREIGN KEY (department_id)
        REFERENCES departments(department_id),

    FOREIGN KEY (position_id)
        REFERENCES positions(position_id),

    FOREIGN KEY (salary_id)
        REFERENCES salaries(salary_id),

    FOREIGN KEY (work_hour_id)
        REFERENCES work_hours(work_hour_id),

    FOREIGN KEY (employee_id)
        REFERENCES employees(employee_id)
);

CREATE INDEX idx_transaction_date
ON transactions(transaction_date);



(function() {

    let todos = []; // хранилище списка всех задач
    let users = []; // хранилище списка всех пользователей

    const todoInput = document.getElementById('new-todo');
    const userSelect = document.getElementById('user-todo');
    const todoList = document.getElementById('todo-list');

    /*
     * Базовая логика приложения — создание списка всех задач и списка пользователей
     * после загрузки страницы. При формировании списка задач назначаются обработчики
     * клика по checkbox статуса задачи и клика по кнопке удаления задачи.
     */

    document.addEventListener('DOMContentLoaded', initApp);
    document.querySelector('form').addEventListener('submit', handleSubmit);

    // вызывается, когда документ полностью загружен и DOM модель построена
    function initApp() {
        Promise.all([getAllTodos(), getAllUsers()]).then((values) => {
            [todos, users] = values;
            // формируем список всех задач и список всех пользователей
            todos.forEach(todo => createTodoElement(todo));
            users.forEach(user => createUserElement(user));
        });
    }

    // добавляет в DOM документа один элемент <li> списка всех задач
    function createTodoElement({ id, userId, title, completed }) {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.id = id;
        li.innerHTML = `<span>${title} <i>by</i> <b>${getUserName(userId)}</b></span>`;

        const status = document.createElement('input');
        status.type = 'checkbox';
        status.checked = completed;
        status.addEventListener('change', handleStatusClick); // обработчик клика по статусу задачи

        const close = document.createElement('span');
        close.innerHTML = '&times;';
        close.className = 'close';
        close.addEventListener('click', handleCloseClick); // обработчик клика по кнопке удаления

        li.prepend(status);
        li.append(close);

        todoList.prepend(li);
    }

    // вспомогательная функция, получает имя пользователя по идентификатору
    function getUserName(userId) {
        const user = users.find(usr => usr.id === userId);
        return user.name;
    }

    // добавляет в DOM один элемент <option> списка всех пользователей
    function createUserElement(user) {
        const option = document.createElement('option');
        option.value = user.id;
        option.text = user.name;
        userSelect.append(option);
    }

    // обработчик отправки формы создания новой задачи, отправляет POST-запрос
    // на сервер, добавляет в список всех задач новый элемент
    function handleSubmit(event) {
        event.preventDefault();
        const title = todoInput.value.trim();
        if (title.length === 0) { // нет текста задачи
            todoInput.style.backgroundColor = '#fdd'; // подсветка красным
            setTimeout(() => todoInput.style.backgroundColor = '', 1000);
            return;
        }
        const userId = Number(userSelect.value);
        if (userId === 0) { // не выбран пользователь
            userSelect.style.backgroundColor = '#fdd'; // подсветка красным
            setTimeout(() => userSelect.style.backgroundColor = '', 1000);
            return;
        }
        const completed = false; // статус задачи
        const data = {
            userId,
            title,
            completed
        };
        // отправляем POST-запрос на сервер, добавляем новый DOM-элемент в список задач
        createTodo(data).then(newTodo => {
            if (newTodo) {
                createTodoElement(newTodo);
                todoInput.value = '';
                userSelect.selectedIndex = 0;
            }
        });
    }

    /*
     * Обработчики клика на checkbox изменения статуса задачи и на крестик удаления задачи
     */

    // обработчик изменения checkbox статуса задачи, отправляет PATCH-запрос на сервер
    function handleStatusClick() {
        const todoId = Number(this.parentElement.dataset.id);
        const completed = this.checked;
        toggleStatus(todoId, completed).then(ok => {
            // если запрос на сервер был неудачным, возвращаем старый статус задачи
            if (!ok) this.checked = !this.checked;
        });
    }

    // обработчик клика на кнопку удаления задачи, отправляет DELETE-запрос на сервер,
    // при успешном удалении задачи на сервере — удаляет элемент из списка задач
    function handleCloseClick() {
        const todoId = Number(this.parentElement.dataset.id);
        // удаляем задачу на сервере и удаляем элемент из списка
        deleteTodo(todoId).then(ok => {
            if (ok) eraseTodo(todoId);
        });
    }

    /*
     * После успешного удаления задачи на сервере нужно удалить из DOM-элемент списка
     */

    // удаляет из DOM элемент списка всех задач, когда задача была удалена на сервере
    function eraseTodo(todoId) {
        // удалить задачу из хранилища всех задач
        todos = todos.filter(todo => todo.id !== todoId);
        // удалить элемент из списка всех задач
        const todo = todoList.querySelector(`[data-id="${todoId}"]`);
        todo.querySelector('input').removeEventListener('change', handleStatusClick);
        todo.querySelector('.close').removeEventListener('click', handleCloseClick);
        todo.remove();
    }

    /*
     * Функции для отправки http-запросов на сервер: получение списка задач
     * и пользователей, изменение статуса и удаление задачи
     */

    // получение списка всех задач
    async function getAllTodos() {
        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=15');
            const data = await response.json();
            return data;
        } catch (error) {
            alertError(error);
        }
    }

    // получение всех пользователей
    async function getAllUsers() {
        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/users?_limit=5');
            const data = await response.json();
            return data;
        } catch (error) {
            alertError(error);
        }
    }

    // создание новой задачи
    async function createTodo(todo) {
        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/todos', {
                method: 'POST',
                body: JSON.stringify(todo),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Ошибка при создании задачи');
            }
            const newTodo = await response.json();
            return newTodo;
        } catch (error) {
            alertError(error);
            return false;
        }
    }

    // изменить статус задачи
    async function toggleStatus(todoId, completed) {
        try {
            const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${todoId}`, {
                method: 'PATCH',
                body: JSON.stringify({ completed }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Ошибка при изменении статуса');
            }
            return true;
        } catch (error) {
            alertError(error);
            return false;
        }
    }

    // удалить задачу
    async function deleteTodo(todoId) {
        try {
            const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${todoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Ошибка при удалении задачи');
            }
            return true;
        } catch (error) {
            alertError(error);
            return false;
        }
    }

    /*
     * Обработка всех ошибок, которые могут возникнуть
     */
    function alertError(error) {
        alert(error.message);
    }
})();

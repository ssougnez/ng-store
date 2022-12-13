const { faker } = require('@faker-js/faker');

const AUTHORS = [];
const FULL_AUTHORS = [];

function createRandomAuthor() {
    return {
        id: faker.datatype.number(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: faker.datatype.number({ min: 18, max: 90 })
    };
}

function completeAuthor(author) {
    const complete = { ...author };

    complete.phone = faker.phone.number();
    complete.bio = faker.lorem.lines();

    return complete;
}

Array.from({ length: 10000 }).forEach(() => {
    const author = createRandomAuthor();

    AUTHORS.push(author);
    FULL_AUTHORS.push(completeAuthor(author))
});

module.exports = function () {
    return {
        "authors": AUTHORS,
        "full-authors": FULL_AUTHORS
    }
}
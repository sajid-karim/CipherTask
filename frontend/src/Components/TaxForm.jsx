import React, { useEffect, useState } from "react";
import { Formik, Field, Form, ErrorMessage } from "formik";
import axios from "axios";
import "./styles.css";

const TaxAddForm = () => {
  const initialValues = {
    taxName: "",
    selectedItems: [],
    search: "",
  };

  const [categories, setCategories] = useState([]);
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [filteredCategories, setFilteredCategories] = useState([]);

  const handleCategoryLoad = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories");
      const categories = response.data.categories;
      const uniqueCategories = [...new Set(categories)];
      setCategories(uniqueCategories);
      setFilteredCategories(uniqueCategories);

      // Load items for each category
      uniqueCategories.forEach((category) => {
        handleCategoryItemsLoad(category);
      });
    } catch (error) {
      console.error(error);
      setCategories([]);
      setFilteredCategories([]);
    }
  };

  const handleCategoryItemsLoad = async (category) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/items?category=${category}`
      );
      const items = response.data.items.map((item) => ({
        value: item.name,
        label: item.name,
      }));

      setItemsByCategory((prevItemsByCategory) => ({
        ...prevItemsByCategory,
        [category]: items,
      }));
    } catch (error) {
      console.error(error);
      setItemsByCategory((prevItemsByCategory) => ({
        ...prevItemsByCategory,
        [category]: [],
      }));
    }
  };

  const handleCategoryInputChange = async (
    category,
    { setFieldValue, values }
  ) => {
    if (!itemsByCategory[category]) {
      await handleCategoryItemsLoad(category);
    }

    const categoryItems = itemsByCategory[category];
    const selectedItems = [...values.selectedItems];

    if (!values[category]) {
      // Category is being selected
      if (categoryItems) {
        categoryItems.forEach((item) => {
          if (!selectedItems.includes(item.value)) {
            selectedItems.push(item.value);
          }
        });
      }
    } else {
      // Category is being deselected
      if (categoryItems) {
        categoryItems.forEach((item) => {
          const index = selectedItems.indexOf(item.value);
          if (index !== -1) {
            selectedItems.splice(index, 1);
          }
        });
      }
    }

    setFieldValue(category, !values[category]);
    setFieldValue("selectedItems", selectedItems);
  };

  const handleItemToggle = (item, { setFieldValue, values }) => {
    const { value } = item;
    const selectedItems = [...values.selectedItems];
    const index = selectedItems.indexOf(value);

    if (index === -1) {
      selectedItems.push(value);
    } else {
      selectedItems.splice(index, 1);
    }

    setFieldValue("selectedItems", selectedItems);

    // Update category checkbox status if applicable
    const category = Object.keys(itemsByCategory).find((category) => {
      const categoryItems = itemsByCategory[category];
      return (
        categoryItems && categoryItems.some((item) => item.value === value)
      );
    });

    if (category) {
      const categoryItems = itemsByCategory[category];
      setFieldValue(category, selectedItems.length === categoryItems.length);
    }
  };

  const handleSearchChange = (event) => {
    const { value } = event.target;

    const filteredCategories = categories.filter((category) => {
      if (category) return category.toLowerCase().includes(value.toLowerCase());
    });

    setFilteredCategories(filteredCategories);
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      console.log(values);
      const { item, taxName, taxPercent } = values;

      if (item === "all") {
        // If applied_to is "all", set selectedItems to contain all available items
        const allItems = Object.values(itemsByCategory)
          .flat()
          .map((item) => item.value);
        values.selectedItems = allItems;
      }

      const payload = {
        applicable_items: values.selectedItems,
        applied_to: item,
        name: taxName,
        rate: taxPercent,
      };

      const response = await axios.post(
        "http://localhost:5000/api/tax",
        payload
      );
      console.log(response.data); // Handle success response
    } catch (error) {
      console.error(error); // Handle error response
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    handleCategoryLoad();
  }, []);

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ isSubmitting, setFieldValue, values }) => (
        <Form>
          <div>
            <label htmlFor="taxName">Add Tax</label>
            <Field
              type="text"
              id="taxName"
              name="taxName"
              className="taxName"
            />
            <ErrorMessage name="taxName" component="div" />

            <Field type="percent" id="taxPercent" name="taxPercent" />
            <ErrorMessage name="taxPercent" component="div" />
          </div>

          <div id="my-selection-radio" role="group">
            <label htmlFor="itemAll">
              <Field type="radio" id="itemAll" name="item" value="all" />
              Apply to all items in Collections
            </label>

            <label htmlFor="itemSome">
              <Field type="radio" id="itemSome" name="item" value="some" />
              Apply to specific items
            </label>
          </div>
          <hr />

          <div>
            <label htmlFor="search">Search items:</label>
            <Field
              type="text"
              id="search"
              name="search"
              onChange={handleSearchChange}
              value={values.search}
            />
            <ErrorMessage name="search" component="div" />
          </div>

          <div>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <div key={category}>
                  <div htmlFor={category} className="checkbox-group">
                    <Field
                      type="checkbox"
                      id={category}
                      name={category}
                      checked={values[category]}
                      onChange={() =>
                        handleCategoryInputChange(category, {
                          setFieldValue,
                          values,
                        })
                      }
                    />
                    {category}
                  </div>
                  <div className="sub-items">
                    {itemsByCategory[category] &&
                      itemsByCategory[category].map((item) => (
                        <label key={item.value}>
                          <Field
                            type="checkbox"
                            name="selectedItems"
                            value={item.value}
                            checked={values.selectedItems.includes(item.value)}
                            onChange={() =>
                              handleItemToggle(item, { setFieldValue, values })
                            }
                          />
                          {item.label}
                        </label>
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <div>No categories found.</div>
            )}
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: "orange",
              color: "white",
              fontSize: "1.2em",
              position: "fixed",
              bottom: "20px",
              right: "20px",
              padding: "10px 20px",
            }}
            disabled={isSubmitting}
          >
            Apply tax to {values.selectedItems.length}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default TaxAddForm;

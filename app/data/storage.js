import AsyncStorage from "@react-native-async-storage/async-storage";

const getData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('quotes')
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.log("error reading value from getData", e)
  }
}

const storeData = async (value) => {
  try {
    const jsonValue = JSON.stringify(value)
    await AsyncStorage.setItem('quotes', jsonValue)
  } catch (e) {
    console.log("error saving value from storeData", e)
  }
}

export { getData, storeData }
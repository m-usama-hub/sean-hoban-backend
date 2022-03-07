exports.filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.handler = async (cb) => {
  return async () => {
    try {
      const data = await cb();
      return [data, null];
    } catch (error) {
      return [null, error];
    }
  };
};

exports.InjectObjKey = (obj, removedFieldArray) => {
  const newObj = obj;
  removedFieldArray.forEach((el) => {
    delete newObj[el];
  });
  return newObj;
};

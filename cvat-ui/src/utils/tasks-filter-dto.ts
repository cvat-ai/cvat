export default (params: { search?: string, page?: string }): { search?: string, page?: number } => {
  const queryObject: { search?: string, page?: number } = {};

  if (params['search']) {
    queryObject.search = params.search.toString();
  }

  if (params['page']) {
    queryObject.page = parseInt(params.page);
  }

  return queryObject;
}

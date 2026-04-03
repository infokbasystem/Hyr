using System.Linq.Expressions;

namespace Hyr.Api.Utils
{
    public static class QueryableExtensions
    {
        /// <summary>
        /// Applies multiple sort operations to a queryable.
        /// </summary>
        /// <typeparam name="T">The entity type</typeparam>
        /// <param name="source">The queryable source</param>
        /// <param name="sortBy">Array of sort criteria in format "PropertyName:asc" or "PropertyName:desc"</param>
        /// <returns>Sorted queryable</returns>
        public static IQueryable<T> ApplyMultiSort<T>(this IQueryable<T> source, string[]? sortBy)
        {
            if (sortBy == null || sortBy.Length == 0)
            {
                return source;
            }

            IOrderedQueryable<T>? orderedQuery = null;

            for (int i = 0; i < sortBy.Length; i++)
            {
                var sortCriteria = sortBy[i];
                if (string.IsNullOrWhiteSpace(sortCriteria))
                {
                    continue;
                }

                var parts = sortCriteria.Split(':');
                var propertyName = parts[0].Trim();
                var direction = parts.Length > 1 ? parts[1].Trim().ToLower() : "asc";

                if (string.IsNullOrWhiteSpace(propertyName))
                {
                    continue;
                }

                // Capitalize first letter to match C# property naming convention
                propertyName = char.ToUpper(propertyName[0]) + propertyName.Substring(1);

                var parameter = Expression.Parameter(typeof(T), "x");
                
                // Build nested property access (e.g., Customer.Name)
                MemberExpression? property = null;
                try
                {
                    var propertyParts = propertyName.Split('.');
                    Expression propertyAccess = parameter;
                    
                    foreach (var part in propertyParts)
                    {
                        var propertyInfo = propertyAccess.Type.GetProperty(part);
                        if (propertyInfo == null)
                        {
                            // Property not found, skip this sort criteria
                            continue;
                        }
                        propertyAccess = Expression.Property(propertyAccess, propertyInfo);
                    }
                    
                    property = propertyAccess as MemberExpression;
                    if (property == null && propertyAccess is Expression)
                    {
                        property = propertyAccess as MemberExpression ?? Expression.Property(parameter, propertyParts[propertyParts.Length - 1]);
                    }
                }
                catch
                {
                    // Property not found, skip this sort criteria
                    continue;
                }

                if (property == null)
                {
                    continue;
                }

                var lambda = Expression.Lambda(property, parameter);
                
                string methodName;
                if (i == 0)
                {
                    // First sort operation
                    methodName = direction == "desc" ? "OrderByDescending" : "OrderBy";
                    var method = typeof(Queryable).GetMethods()
                        .FirstOrDefault(m => m.Name == methodName && m.GetParameters().Length == 2);
                    
                    if (method != null)
                    {
                        var genericMethod = method.MakeGenericMethod(typeof(T), property.Type);
                        orderedQuery = (IOrderedQueryable<T>)genericMethod.Invoke(null, new object[] { source, lambda })!;
                    }
                }
                else
                {
                    // Subsequent sort operations
                    methodName = direction == "desc" ? "ThenByDescending" : "ThenBy";
                    var method = typeof(Queryable).GetMethods()
                        .FirstOrDefault(m => m.Name == methodName && m.GetParameters().Length == 2);
                    
                    if (method != null && orderedQuery != null)
                    {
                        var genericMethod = method.MakeGenericMethod(typeof(T), property.Type);
                        orderedQuery = (IOrderedQueryable<T>)genericMethod.Invoke(null, new object[] { orderedQuery, lambda })!;
                    }
                }
            }

            return orderedQuery ?? source;
        }
    }
}

def lemonadeChange(N, bills):
    f5 = 0
    t10 = 0
    for i in bills:
        if i==5:
            f5+=1
        elif i==10:
            if f5>0:
                f5-=1
                t10+=1
            else:
                return "NO"
        else:
            if t10>0 and f5>0:
                t10-=1
                f5-=1
            elif f5>=3:
                f5-=3
            else:
                return "NO"
    return "YES"
                
    
# Test Cases
print(lemonadeChange(5, [5,5,5,10,20]))    # YES ✅
print(lemonadeChange(5, [5,5,10,10,20]))   # NO ✅
print(lemonadeChange(1, [5]))              # YES ✅
print(lemonadeChange(2, [10,10]))          # NO ✅

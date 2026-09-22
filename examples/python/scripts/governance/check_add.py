from app.calc import add

if add(2, 3) != 5:
    raise AssertionError("addition behavior")
if add(-2, 2) != 0:
    raise AssertionError("signed addition behavior")
